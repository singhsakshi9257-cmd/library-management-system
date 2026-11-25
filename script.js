const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "library-management-demo-v1";

const categories = [
  "Computer Science",
  "Engineering",
  "Science",
  "Fiction",
  "Others"
];

const colors = [
  "#2288f3",
  "#16b568",
  "#ff7a22",
  "#7449e9",
  "#9da6b0"
];

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function createInitialData() {
  return {
    books: [
      {
        id: "b1",
        title: "Python Basics",
        author: "Demo Author",
        category: "Computer Science",
        copies: 150
      },
      {
        id: "b2",
        title: "Engineering Fundamentals",
        author: "Demo Author",
        category: "Engineering",
        copies: 100
      },
      {
        id: "b3",
        title: "General Science",
        author: "Demo Author",
        category: "Science",
        copies: 75
      },
      {
        id: "b4",
        title: "The Reading Journey",
        author: "Demo Author",
        category: "Fiction",
        copies: 50
      },
      {
        id: "b5",
        title: "General Knowledge",
        author: "Demo Author",
        category: "Others",
        copies: 125
      }
    ],

    students: [
      { id: "s1", name: "Rahul", email: "rahul@example.com" },
      { id: "s2", name: "Priya", email: "priya@example.com" },
      { id: "s3", name: "Aman", email: "aman@example.com" },
      { id: "s4", name: "Neha", email: "neha@example.com" },
      { id: "s5", name: "Karan", email: "karan@example.com" }
    ],

    loans: [
      {
        id: "l1",
        bookId: "b1",
        studentId: "s1",
        issued: dateOffset(-2),
        due: dateOffset(12),
        returned: null
      },
      {
        id: "l2",
        bookId: "b2",
        studentId: "s2",
        issued: dateOffset(-3),
        due: dateOffset(11),
        returned: null
      },
      {
        id: "l3",
        bookId: "b3",
        studentId: "s3",
        issued: dateOffset(-16),
        due: dateOffset(-2),
        returned: null
      },
      {
        id: "l4",
        bookId: "b4",
        studentId: "s4",
        issued: dateOffset(-5),
        due: dateOffset(9),
        returned: null
      },
      {
        id: "l5",
        bookId: "b5",
        studentId: "s5",
        issued: dateOffset(-6),
        due: dateOffset(8),
        returned: null
      }
    ]
  };
}

let state;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  state = saved ? JSON.parse(saved) : createInitialData();

  if (
    !Array.isArray(state.books) ||
    !Array.isArray(state.students) ||
    !Array.isArray(state.loans)
  ) {
    throw new Error("Invalid saved data");
  }
} catch {
  state = createInitialData();
  $("#message").textContent =
    "Saved data could not be loaded. Using demo data.";
}
// Add reservations to existing saved libraries without resetting them.
if (!Array.isArray(state.reservations)) {
  state.reservations = [];
}
let currentView = "dashboard";
let currentAction = "";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
function makeId(prefix) {
  return prefix + "-" + Date.now() +
    "-" + Math.floor(Math.random() * 10000);
}

function activeLoans() {
  return state.loans.filter((loan) => !loan.returned);
}

function isOverdue(loan) {
  return !loan.returned && loan.due < dateOffset(0);
}
function daysOverdue(dueDate) {
  const [dueYear, dueMonth, dueDay] = dueDate.split("-").map(Number);

  const [todayYear, todayMonth, todayDay] = dateOffset(0)
    .split("-")
    .map(Number);

  const due = Date.UTC(dueYear, dueMonth - 1, dueDay);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.max(0, Math.round((today - due) / 86400000));
}


function renderOverdue() {
  const allOverdue = state.loans.filter(isOverdue);

  const filtered = allOverdue
    .filter((loan) =>
      matchesSearch(
        bookTitle(loan.bookId),
        studentName(loan.studentId)
      )
    )
    .sort((a, b) => a.due.localeCompare(b.due));

  $("#overdue-summary").textContent =
    `Showing ${filtered.length} of ${allOverdue.length} overdue loans.`;

  $("#overdue-table").innerHTML = filtered.map((loan) => `
    <tr>
      <td>${escapeHTML(bookTitle(loan.bookId))}</td>
      <td>${escapeHTML(studentName(loan.studentId))}</td>
      <td>${formatDate(loan.due)}</td>
      <td>
        <span class="overdue-days">
          ${daysOverdue(loan.due)}
        </span>
      </td>
      <td>
        <button
          type="button"
          class="primary-button overdue-return-button"
          data-return-loan="${escapeHTML(loan.id)}"
        >
          Return Book
        </button>
      </td>
    </tr>
  `).join("") || emptyRow(
    5,
    allOverdue.length
      ? "No overdue loans match your search."
      : "No overdue books. All caught up!"
  );
}


function openReturnForLoan(loanId) {
  const loan = state.loans.find(
    (item) => item.id === loanId && !item.returned
  );

  if (!loan) {
    $("#message").textContent = "This loan is no longer active.";
    render();
    return;
  }

  openModal("return");

  const loanSelect = document.querySelector(
    '#action-form select[name="loanId"]'
  );

  if (loanSelect) {
    loanSelect.value = loanId;
  }
}
function shelfCopies(bookId) {
  const book = state.books.find((item) => item.id === bookId);

  const issued = activeLoans().filter(
    (loan) => loan.bookId === bookId
  ).length;

  return book ? Math.max(0, book.copies - issued) : 0;
}


function readyReservationCount(bookId) {
  return state.reservations.filter(
    (reservation) =>
      reservation.bookId === bookId &&
      reservation.status === "ready"
  ).length;
}


function availableCopies(bookId) {
  return Math.max(
    0,
    shelfCopies(bookId) - readyReservationCount(bookId)
  );
}


function bookTitle(bookId) {
  return state.books.find((book) => book.id === bookId)?.title
    ?? "Unknown book";
}

function studentName(studentId) {
  return state.students.find((student) => student.id === studentId)?.name
    ?? "Unknown student";
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function save(message) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#message").textContent = message;
  } catch {
    $("#message").textContent =
      `${message} Browser storage is unavailable; changes may be lost on refresh.`;
  }

  render();
}

function emptyRow(columns, text) {
  return `<tr><td class="empty" colspan="${columns}">
    ${escapeHTML(text)}
  </td></tr>`;
}

function matchesSearch(...values) {
  const query = $("#search").value.trim().toLowerCase();

  return values.some((value) =>
    String(value).toLowerCase().includes(query)
  );
}

function render() {
  const total = state.books.reduce(
    (sum, book) => sum + book.copies,
    0
  );

  const loans = activeLoans();
  const overdue = loans.filter(isOverdue).length;

  $("#total-books").textContent = total;
  $("#total-students").textContent = state.students.length;
  $("#issued-books").textContent = loans.length;
  $("#overdue-books").textContent = overdue;

  const recent = loans
    .filter((loan) =>
      matchesSearch(
        bookTitle(loan.bookId),
        studentName(loan.studentId)
      )
    )
    .sort((a, b) => b.issued.localeCompare(a.issued))
    .slice(0, 5);

  $("#recent-issues").innerHTML = recent.map((loan, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(bookTitle(loan.bookId))}</td>
      <td>${escapeHTML(studentName(loan.studentId))}</td>
      <td>${formatDate(loan.issued)}</td>
    </tr>
  `).join("") || emptyRow(4, "No matching active loans.");

  const filteredBooks = state.books.filter((book) =>
    matchesSearch(book.title, book.author, book.category)
  );

  $("#books-table").innerHTML = filteredBooks.map((book) => `
    <tr>
      <td>${escapeHTML(book.title)}</td>
      <td>${escapeHTML(book.author)}</td>
      <td>${escapeHTML(book.category)}</td>
      <td>${book.copies}</td>
      <td>${availableCopies(book.id)}</td>
    </tr>
  `).join("") || emptyRow(5, "No books found.");

  const filteredStudents = state.students.filter((student) =>
    matchesSearch(student.id, student.name, student.email)
  );

  $("#students-table").innerHTML = filteredStudents.map((student) => `
    <tr>
      <td>${escapeHTML(student.id)}</td>
      <td>${escapeHTML(student.name)}</td>
      <td>${escapeHTML(student.email)}</td>
      <td>${
        loans.filter((loan) => loan.studentId === student.id).length
      }</td>
    </tr>
  `).join("") || emptyRow(4, "No students found.");

  const history = [...state.loans]
    .filter((loan) =>
      matchesSearch(
        bookTitle(loan.bookId),
        studentName(loan.studentId)
      )
    )
    .sort((a, b) => b.issued.localeCompare(a.issued));

  $("#reports-table").innerHTML = history.map((loan) => {
    const status = loan.returned
      ? `Returned ${formatDate(loan.returned)}`
      : isOverdue(loan)
        ? "Overdue"
        : "Issued";

    return `
      <tr>
        <td>${escapeHTML(bookTitle(loan.bookId))}</td>
        <td>${escapeHTML(studentName(loan.studentId))}</td>
        <td>${formatDate(loan.issued)}</td>
        <td>${formatDate(loan.due)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join("") || emptyRow(5, "No loan history found.");
  renderOverdue();
  renderCharts(total, loans.length, overdue);
}

function renderCharts(total, issued, overdue) {
  const values = [
    { label: "Books Available", value: total - issued, color: colors[1] },
    { label: "Issued Books", value: issued, color: colors[0] },
    { label: "Overdue Books", value: overdue, color: "#e83f40" }
  ];

  const maximum = Math.max(...values.map((item) => item.value), 1);

  $("#bar-chart").innerHTML = values.map((item) => `
    <div class="bar-column">
      <strong>${item.value}</strong>
      <div
        class="bar"
        style="height:${item.value / maximum * 145}px;
               background:${item.color}"
      ></div>
      <span class="bar-label">${item.label}</span>
    </div>
  `).join("");

  const counts = categories.map((category) =>
    state.books
      .filter((book) => book.category === category)
      .reduce((sum, book) => sum + book.copies, 0)
  );

  let position = 0;

  const segments = counts.map((count, index) => {
    const start = position;
    position += total ? count / total * 100 : 0;

    return `${colors[index]} ${start}% ${position}%`;
  });

  $("#donut").style.background = total
    ? `conic-gradient(${segments.join(",")})`
    : "#e2e8f0";

  $("#donut-total").textContent = total;

  $("#category-legend").innerHTML = categories.map((category, index) => `
    <li>
      <span
        class="legend-dot"
        style="background:${colors[index]}"
      ></span>
      ${category}
      <b>${total ? Math.round(counts[index] / total * 100) : 0}%</b>
    </li>
  `).join("");
}

function showView(view) {
  currentView = view;

  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.id !== `${view}-view`;
  });

  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

 const titles = {
  dashboard: [
    "Dashboard",
    "Welcome back, Admin! Here’s an overview of your library."
  ],
  books: [
    "Books",
    "Manage your library’s book inventory."
  ],
  students: [
    "Students",
    "View and manage registered students."
  ],
  overdue: [
    "Overdue Books",
    "Review overdue loans and record returned books."
  ],
  reservations: [
  "Reservations",
  "Manage waiting lists and books ready for pickup."
],
  reports: [
    "Reports",
    "Track issued, overdue, and returned books."
  ]
};
  $("#page-title").textContent = titles[view][0];
  $("#page-description").textContent = titles[view][1];
}

function options(items, getLabel) {
  return items.map((item) => `
    <option value="${escapeHTML(item.id)}">
      ${escapeHTML(getLabel(item))}
    </option>
  `).join("");
}

function openModal(action) {
  currentAction = action;
  let fields = "";
  let title = "";

  if (action === "book") {
    title = "Add Book";

    fields = `
      <label>
        Book Title
        <input name="title" required maxlength="150">
      </label>

      <label>
        Author
        <input name="author" required maxlength="100">
      </label>

      <label>
        Category
        <select name="category">
          ${categories.map((category) =>
            `<option>${category}</option>`
          ).join("")}
        </select>
      </label>

      <label>
        Number of Copies
        <input
          name="copies"
          type="number"
          min="1"
          max="10000"
          step="1"
          value="1"
          required
        >
      </label>
    `;
  }

  if (action === "student") {
    title = "Add Student";

    fields = `
      <label>
        Student Name
        <input name="name" required maxlength="100">
      </label>

      <label>
        Email
        <input name="email" type="email" required maxlength="150">
      </label>
    `;
  }

  if (action === "issue") {
    title = "Issue Book";

    const available = state.books.filter(
      (book) => availableCopies(book.id) > 0
    );

    if (!available.length || !state.students.length) {
      $("#message").textContent =
        "Add an available book and at least one student first.";
      return;
    }

    fields = `
      <label>
        Book
        <select name="bookId" required>
          ${options(
            available,
            (book) => `${book.title} (${availableCopies(book.id)} available)`
          )}
        </select>
      </label>

      <label>
        Student
        <select name="studentId" required>
          ${options(
            state.students,
            (student) => `${student.name} — ${student.email}`
          )}
        </select>
      </label>

      <label>
        Due Date
        <input
          name="due"
          type="date"
          min="${dateOffset(0)}"
          value="${dateOffset(14)}"
          required
        >
      </label>
    `;
  }

  if (action === "return") {
    title = "Return Book";
    const loans = activeLoans();

    if (!loans.length) {
      $("#message").textContent = "There are no active loans to return.";
      return;
    }

    fields = `
      <label>
        Select Loan
        <select name="loanId" required>
          ${options(
            loans,
            (loan) =>
              `${bookTitle(loan.bookId)} — ${studentName(loan.studentId)}`
          )}
        </select>
      </label>
    `;
  }
  if (action === "reserve") {
    title = "Reserve Book";

    const unavailableBooks = state.books.filter(
      (book) => availableCopies(book.id) === 0
    );

    if (state.students.length === 0) {
      $("#message").textContent =
        "Add at least one student before reserving a book.";
      return;
    }

    if (unavailableBooks.length === 0) {
      $("#message").textContent =
        "No books need a reservation. Issue all available copies of a test book first.";
      return;
    }

    fields = `
      <label>
        Book
        <select name="bookId" required>
          <option value="">Choose a book</option>

          ${options(
            unavailableBooks,
            (book) => book.title
          )}
        </select>
      </label>

      <label>
        Student
        <select name="studentId" required>
          <option value="">Choose a student</option>

          ${options(
            state.students,
            (student) => `${student.name} — ${student.email}`
          )}
        </select>
      </label>
    `;
  }
  $("#modal-title").textContent = title;
  $("#action-form").innerHTML = `
    ${fields}
    <button class="primary-button" type="submit">${title}</button>
  `;

  $("#modal").showModal();
}

$("#action-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  const get = (name) => String(data.get(name) ?? "").trim();

  let message = "";

  if (currentAction === "book") {
    const title = get("title");
    const author = get("author");
    const copies = Number(get("copies"));

    if (!title || !author || !Number.isInteger(copies) || copies < 1) {
      alert("Enter a title, author, and valid whole number of copies.");
      return;
    }

    state.books.push({
      id: makeId("b"),
      title,
      author,
      category: get("category"),
      copies
    });

    message = "Book added successfully.";
  }

  if (currentAction === "student") {
    const name = get("name");
    const email = get("email").toLowerCase();

    if (!name) {
      alert("Enter a student name.");
      return;
    }

    if (state.students.some((student) =>
      student.email.toLowerCase() === email
    )) {
      alert("A student with this email already exists.");
      return;
    }

    state.students.push({
      id: makeId("s"),
      name,
      email
    });

    message = "Student added successfully.";
  }

  if (currentAction === "issue") {
    const bookId = get("bookId");
    const studentId = get("studentId");
    const due = get("due");

    if (
      availableCopies(bookId) < 1 ||
      !state.students.some((student) => student.id === studentId) ||
      due < dateOffset(0)
    ) {
      alert("Choose an available book, a student, and a valid due date.");
      return;
    }

    state.loans.push({
      id: makeId("l"),
      bookId,
      studentId,
      issued: dateOffset(0),
      due,
      returned: null
    });

    message = "Book issued successfully.";
  }

  if (currentAction === "return") {
    const loan = state.loans.find(
      (item) => item.id === get("loanId") && !item.returned
    );

    if (!loan) {
      alert("This loan is no longer active.");
      return;
    }

    loan.returned = dateOffset(0);
    message = "Book returned successfully.";
  }
if (currentAction === "reserve") {

  const bookId = get("bookId");
  const studentId = get("studentId");

  state.reservations.push({
    id: makeId("r"),
    bookId,
    studentId,
    reservedOn: dateOffset(0),
    status: "waiting"
  });

  message = "Reservation created successfully.";
}
  $("#modal").close();
  save(message);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.returnLoan) {
    openReturnForLoan(button.dataset.returnLoan);
    return;
  }

  if (button.dataset.view) {
    showView(button.dataset.view);
  }

  if (button.dataset.action) {
    openModal(button.dataset.action);
  }
});
$("#close-modal").addEventListener("click", () => {
  $("#modal").close();
});

$("#search").addEventListener("input", render);

$("#print-report").addEventListener("click", () => {
  window.print();
});

function updateClock() {
  const now = new Date();

  $("#clock").textContent =
    `${now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })} · ${now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

updateClock();

setInterval(() => {
  updateClock();
  render();
}, 60000);

showView(currentView);
render();