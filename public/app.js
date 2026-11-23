const configurations = {
  books: {
    label: 'libro',
    plural: 'libros',
    dataKey: 'booksPage',
    query: 'booksPage',
    create: 'createBook',
    update: 'updateBook',
    remove: 'deleteBook',
    createInput: 'BookInput',
    updateInput: 'BookUpdateInput',
    fields: ['title', 'author', 'isbn', 'publishedYear', 'genre']
  },
  users: {
    label: 'usuario',
    plural: 'usuarios',
    dataKey: 'usersPage',
    query: 'usersPage',
    create: 'createUser',
    update: 'updateUser',
    remove: 'deleteUser',
    createInput: 'UserInput',
    updateInput: 'UserUpdateInput',
    fields: ['fullName', 'email', 'phone']
  }
};

const state = {
  books: [],
  users: [],
  loans: [],
  returns: [],
  dashboardLoans: null,
  genres: [],
  pendingLoans: [],
  managedBook: null,
  editing: { books: null, users: null },
  pages: {
    books: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    users: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    loans: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    returns: { page: 1, pageSize: 10, total: 0, totalPages: 1 }
  },
  timers: {},
  optionRequestIds: { books: 0, users: 0, copies: 0, pending: 0 }
};
const numberFormat = new Intl.NumberFormat('es-MX');
const dateFormat = new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

async function request(query, variables = {}) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta que no se pudo leer.');
  }
  if (!response.ok || result.errors) {
    throw new Error(result.errors?.[0]?.message || 'No se pudo completar la solicitud.');
  }
  return result.data;
}

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function formatNumber(value) {
  return numberFormat.format(value ?? 0);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

function localDateValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDaysToDate(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function appendCell(row, value, className = '') {
  const cell = document.createElement('td');
  cell.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}

function renderEmpty(tbody, columnCount, message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = 'empty-cell';
  cell.textContent = message;
  row.appendChild(cell);
  tbody.replaceChildren(row);
}

function currentRoute() {
  const route = window.location.hash.slice(1);
  return ['inicio', 'libros', 'usuarios', 'prestamos', 'devoluciones'].includes(route) ? route : 'inicio';
}

function navigate() {
  const route = currentRoute();
  document.querySelectorAll('[data-view]').forEach((view) => {
    view.hidden = view.dataset.view !== route;
  });
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (route === 'inicio') loadDashboard();
  if (route === 'libros') loadRecords('books');
  if (route === 'usuarios') loadRecords('users');
  if (route === 'prestamos') loadLoans();
  if (route === 'devoluciones') loadReturns();
}

function renderPageControls(key, result) {
  const paging = state.pages[key];
  paging.page = result.page;
  paging.pageSize = result.pageSize;
  paging.total = result.total;
  paging.totalPages = Math.max(1, result.totalPages);
  document.querySelector(`#${key}-page-size`).value = String(result.pageSize);
  document.querySelector(`#${key}-page-info`).textContent =
    `Página ${result.page} de ${paging.totalPages} · ${formatNumber(result.total)} resultados`;
  document.querySelector(`#${key}-previous`).disabled = result.page <= 1;
  document.querySelector(`#${key}-next`).disabled = result.page >= paging.totalPages;
}

function populateGenres() {
  const select = document.querySelector('#books-genre');
  const currentValue = select.value;
  select.replaceChildren(new Option('Todos los géneros', ''));
  state.genres.forEach((genre) => select.add(new Option(genre, genre)));
  if (state.genres.includes(currentValue)) select.value = currentValue;
}

async function loadGenres() {
  if (state.genres.length) return;
  const data = await request('{ esauBooksByGenre { genre } }');
  state.genres = data.esauBooksByGenre.map((item) => item.genre);
  populateGenres();
}

function renderRecords(entity, items) {
  const tbody = document.querySelector(`#${entity}-list`);
  const records = state[entity] = items;
  tbody.replaceChildren();
  if (!records.length) {
    renderEmpty(tbody, entity === 'books' ? 6 : 4, 'No hay resultados para esta página y búsqueda.');
    return;
  }
  records.forEach((record) => {
    const row = document.createElement('tr');
    if (entity === 'books') {
      appendCell(row, record.title);
      appendCell(row, record.author);
      appendCell(row, record.genre || '—');
      appendCell(row, record.isbn);
      appendCell(row, record.publishedYear);
    } else {
      appendCell(row, record.fullName);
      appendCell(row, record.email);
      appendCell(row, record.phone);
    }

    const actions = document.createElement('td');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-button';
    edit.dataset.action = 'edit';
    edit.dataset.id = record.id;
    edit.textContent = 'Editar';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button danger';
    remove.dataset.action = 'delete';
    remove.dataset.id = record.id;
    remove.textContent = 'Eliminar';
    if (entity === 'books') {
      const manageCopies = document.createElement('button');
      manageCopies.type = 'button';
      manageCopies.className = 'text-button';
      manageCopies.dataset.action = 'copies';
      manageCopies.dataset.id = record.id;
      manageCopies.textContent = 'Gestionar ejemplares';
      actions.append(manageCopies);
    }
    actions.append(edit, remove);
    row.appendChild(actions);
    tbody.appendChild(row);
  });
}

async function loadRecords(entity) {
  const config = configurations[entity];
  const paging = state.pages[entity];
  const message = document.querySelector(`#${entity}-message`);
  const count = document.querySelector(`#${entity}-count`);
  const search = document.querySelector(`#${entity}-search`).value.trim();
  const isBooks = entity === 'books';
  const genre = isBooks ? document.querySelector('#books-genre').value || null : null;
  showMessage(message, 'Consultando MongoDB…');
  count.textContent = 'Cargando…';
  try {
    if (isBooks) await loadGenres();
    const query = `query Page($search: String${isBooks ? ', $genre: String' : ''}, $page: Int!, $pageSize: Int!) {
      ${config.query}(search: $search${isBooks ? ', genre: $genre' : ''}, page: $page, pageSize: $pageSize) {
        items { ${isBooks ? 'id title author isbn publishedYear genre' : 'id fullName email phone'} }
        total page pageSize totalPages
      }
    }`;
    const variables = { search: search || null, page: paging.page, pageSize: paging.pageSize };
    if (isBooks) variables.genre = genre;
    const data = await request(query, variables);
    const result = data[config.dataKey];
    if (result.page > result.totalPages && result.total > 0) {
      paging.page = result.totalPages;
      return loadRecords(entity);
    }
    renderPageControls(entity, result);
    renderRecords(entity, result.items);
    count.textContent = `${formatNumber(result.total)} ${config.plural}`;
    showMessage(message, '');
  } catch (error) {
    count.textContent = 'No disponible';
    showMessage(message, error.message, true);
    renderEmpty(document.querySelector(`#${entity}-list`), isBooks ? 6 : 4, 'No se pudieron cargar los datos.');
  }
}

function appendStatusCell(row, status) {
  const cell = document.createElement('td');
  const pill = document.createElement('span');
  const labels = { active: 'Activo', overdue: 'Vencido', returned: 'Devuelto' };
  pill.className = `status-pill ${status}`;
  pill.textContent = labels[status] || status;
  cell.appendChild(pill);
  row.appendChild(cell);
}

function renderDashboardLoans() {
  const recent = document.querySelector('#recent-loans');
  const overdue = document.querySelector('#dashboard-overdue');
  if (!state.dashboardLoans) {
    renderEmpty(recent, 5, 'No se pudieron cargar los préstamos.');
    renderEmpty(overdue, 4, 'No se pudieron cargar los préstamos.');
    return;
  }
  recent.replaceChildren();
  overdue.replaceChildren();
  if (!state.dashboardLoans.recent.length) renderEmpty(recent, 5, 'Todavía no hay préstamos registrados.');
  state.dashboardLoans.recent.forEach((loan) => {
    const row = document.createElement('tr');
    appendCell(row, loan.title);
    appendCell(row, loan.userName);
    appendCell(row, formatDate(loan.loanDate));
    appendCell(row, formatDate(loan.dueDate));
    appendStatusCell(row, loan.status);
    recent.appendChild(row);
  });
  if (!state.dashboardLoans.overdue.length) renderEmpty(overdue, 4, 'No hay préstamos vencidos.');
  state.dashboardLoans.overdue.forEach((loan) => {
    const row = document.createElement('tr');
    appendCell(row, loan.title);
    appendCell(row, loan.userName);
    appendCell(row, formatDate(loan.dueDate));
    appendCell(row, `${formatNumber(loan.daysOverdue)} días`, 'late-value');
    overdue.appendChild(row);
  });
}

async function loadDashboard(force = false) {
  const message = document.querySelector('#dashboard-message');
  showMessage(message, 'Actualizando indicadores…');
  let failed = false;
  const overviewRequest = request(`query {
    libraryOverview {
      totalBooks totalUsers totalCopies availableCopies totalLoans activeLoans overdueLoans returnedLoans
    }
  }`).then(({ libraryOverview }) => {
    document.querySelector('#stat-books').textContent = formatNumber(libraryOverview.totalBooks);
    document.querySelector('#stat-users').textContent = formatNumber(libraryOverview.totalUsers);
    document.querySelector('#stat-copies').textContent = formatNumber(libraryOverview.availableCopies);
    document.querySelector('#stat-active').textContent = formatNumber(libraryOverview.activeLoans);
    document.querySelector('#stat-overdue').textContent = formatNumber(libraryOverview.overdueLoans);
  }).catch((error) => {
    failed = true;
    showMessage(message, `No se pudieron cargar las estadísticas: ${error.message}`, true);
  });
  const loansRequest = (async () => {
    if (state.dashboardLoans && !force) return;
    const data = await request(`query DashboardLoans {
      recent: libraryLoans(limit: 8) { loanId title userName loanDate dueDate status daysOverdue }
      overdue: libraryLoans(status: "overdue", limit: 8) { loanId title userName dueDate status daysOverdue }
    }`);
    state.dashboardLoans = { recent: data.recent, overdue: data.overdue };
  })().catch((error) => {
    state.dashboardLoans = null;
    failed = true;
    showMessage(message, `No se pudieron cargar los préstamos: ${error.message}`, true);
  });
  await Promise.all([overviewRequest, loansRequest]);
  renderDashboardLoans();
  if (!failed) showMessage(message, '');
  return !failed;
}

function appendActionButton(row, loan, label = 'Registrar devolución') {
  const cell = document.createElement('td');
  if (loan.status === 'active' || loan.status === 'overdue') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.dataset.returnLoanId = loan.loanId;
    button.textContent = label;
    cell.appendChild(button);
  } else {
    cell.textContent = '—';
  }
  row.appendChild(cell);
}

function renderLoans(result) {
  const tbody = document.querySelector('#loans-list');
  tbody.replaceChildren();
  if (!result.items.length) renderEmpty(tbody, 8, 'No hay préstamos que coincidan con los filtros.');
  result.items.forEach((loan) => {
    const row = document.createElement('tr');
    appendCell(row, loan.title);
    appendCell(row, loan.userName);
    appendCell(row, loan.inventoryCode);
    appendCell(row, formatDate(loan.loanDate));
    appendCell(row, formatDate(loan.dueDate));
    appendStatusCell(row, loan.status);
    appendCell(row, loan.status === 'overdue'
      ? `${formatNumber(loan.daysOverdue)} días de retraso`
      : loan.status === 'active'
        ? loan.daysRemaining === 0 ? 'Vence hoy' : `${formatNumber(loan.daysRemaining)} días restantes`
        : '—', loan.status === 'overdue' ? 'late-value' : '');
    appendActionButton(row, loan);
    tbody.appendChild(row);
  });
  document.querySelector('#loans-count').textContent = `${formatNumber(result.total)} préstamos`;
  renderPageControls('loans', result);
}

async function loadLoans() {
  const paging = state.pages.loans;
  const message = document.querySelector('#loans-message');
  showMessage(message, 'Consultando préstamos…');
  try {
    const data = await request(`query LoansPage($status: String, $search: String, $page: Int!, $pageSize: Int!) {
      loansPage(status: $status, search: $search, page: $page, pageSize: $pageSize) {
        items { loanId title author userName email inventoryCode loanDate dueDate returnDate status daysRemaining daysOverdue }
        total page pageSize totalPages
      }
    }`, {
      status: document.querySelector('#loans-status').value || null,
      search: document.querySelector('#loans-search').value.trim() || null,
      page: paging.page,
      pageSize: paging.pageSize
    });
    const result = data.loansPage;
    if (result.page > result.totalPages && result.total > 0) {
      paging.page = result.totalPages;
      return loadLoans();
    }
    state.loans = result.items;
    renderLoans(result);
    showMessage(message, '');
    return true;
  } catch (error) {
    showMessage(message, error.message, true);
    renderEmpty(document.querySelector('#loans-list'), 8, 'No se pudieron cargar los préstamos.');
    return false;
  }
}

function renderReturns(result) {
  const tbody = document.querySelector('#returns-list');
  tbody.replaceChildren();
  if (!result.items.length) renderEmpty(tbody, 9, 'No hay devoluciones o préstamos vencidos para estos filtros.');
  result.items.forEach((loan) => {
    const row = document.createElement('tr');
    appendCell(row, loan.title);
    appendCell(row, loan.userName);
    appendCell(row, loan.inventoryCode);
    appendCell(row, formatDate(loan.loanDate));
    appendCell(row, formatDate(loan.dueDate));
    appendCell(row, formatDate(loan.returnDate));
    appendStatusCell(row, loan.status);
    appendCell(row, loan.daysOverdue ? `${formatNumber(loan.daysOverdue)} días` : loan.status === 'returned' ? 'A tiempo' : '—', loan.daysOverdue ? 'late-value' : '');
    appendActionButton(row, loan);
    tbody.appendChild(row);
  });
  document.querySelector('#returns-count').textContent = `${formatNumber(result.total)} registros`;
  renderPageControls('returns', result);
}

async function loadReturns() {
  const paging = state.pages.returns;
  const message = document.querySelector('#returns-message');
  showMessage(message, 'Consultando devoluciones…');
  try {
    const data = await request(`query ReturnsPage($status: String, $search: String, $page: Int!, $pageSize: Int!) {
      returnsPage(status: $status, search: $search, page: $page, pageSize: $pageSize) {
        items { loanId title author userName email inventoryCode loanDate dueDate returnDate status daysRemaining daysOverdue }
        total page pageSize totalPages
      }
    }`, {
      status: document.querySelector('#returns-status').value || null,
      search: document.querySelector('#returns-search').value.trim() || null,
      page: paging.page,
      pageSize: paging.pageSize
    });
    const result = data.returnsPage;
    if (result.page > result.totalPages && result.total > 0) {
      paging.page = result.totalPages;
      return loadReturns();
    }
    state.returns = result.items;
    renderReturns(result);
    showMessage(message, '');
    return true;
  } catch (error) {
    showMessage(message, error.message, true);
    renderEmpty(document.querySelector('#returns-list'), 9, 'No se pudieron cargar las devoluciones.');
    return false;
  }
}

function resetForm(entity) {
  const config = configurations[entity];
  const prefix = entity === 'books' ? 'book' : 'user';
  const form = document.querySelector(`#${prefix}-form`);
  state.editing[entity] = null;
  form.reset();
  if (entity === 'books') document.querySelector('#book-first-copy-field').hidden = false;
  document.querySelector(`#${prefix}-form-title`).textContent = `Agregar ${config.label}`;
  document.querySelector(`#${prefix}-submit`).textContent = `Guardar ${config.label}`;
  document.querySelector(`#${prefix}-cancel`).classList.add('hidden');
  showMessage(document.querySelector(`#${prefix}-form-message`), '');
}

function beginEdit(entity, record) {
  const config = configurations[entity];
  const prefix = entity === 'books' ? 'book' : 'user';
  const form = document.querySelector(`#${prefix}-form`);
  state.editing[entity] = record.id;
  if (entity === 'books') {
    document.querySelector('#book-first-copy-field').hidden = true;
    document.querySelector('#book-first-copy').checked = false;
  }
  config.fields.forEach((field) => { form.elements[field].value = record[field] ?? ''; });
  document.querySelector(`#${prefix}-form-title`).textContent = `Editar ${config.label}`;
  document.querySelector(`#${prefix}-submit`).textContent = 'Guardar cambios';
  document.querySelector(`#${prefix}-cancel`).classList.remove('hidden');
  form.elements[config.fields[0]].focus();
}

async function saveRecord(entity, event) {
  event.preventDefault();
  const config = configurations[entity];
  const prefix = entity === 'books' ? 'book' : 'user';
  const form = event.currentTarget;
  const message = document.querySelector(`#${prefix}-form-message`);
  const submit = document.querySelector(`#${prefix}-submit`);
  const editingId = state.editing[entity];
  const values = Object.fromEntries(new FormData(form).entries());
  if ('publishedYear' in values) values.publishedYear = values.publishedYear ? Number(values.publishedYear) : null;
  const operation = editingId ? config.update : config.create;
  const inputType = editingId ? config.updateInput : config.createInput;
  const createFirstCopy = entity === 'books' && !editingId && document.querySelector('#book-first-copy').checked;
  const query = createFirstCopy
    ? 'mutation CreateBookWithCopy($input: BookInput!) { createBookWithFirstCopy(input: $input) { book { id } copy { id inventoryCode status } } }'
    : editingId
      ? `mutation Update($id: ID!, $input: ${inputType}!) { ${operation}(id: $id, input: $input) { id } }`
      : `mutation Create($input: ${inputType}!) { ${operation}(input: $input) { id } }`;
  submit.disabled = true;
  showMessage(message, 'Guardando…');
  try {
    await request(query, editingId ? { id: editingId, input: values } : { input: values });
    if (!editingId) state.pages[entity].page = 1;
    resetForm(entity);
    showMessage(message, createFirstCopy
      ? 'Se guardó el libro y se registró su primer ejemplar disponible.'
      : `Se guardó el ${config.label}.`);
    await loadRecords(entity);
  } catch (error) {
    showMessage(message, error.message, true);
  } finally {
    submit.disabled = false;
  }
}

async function deleteRecord(entity, record) {
  const config = configurations[entity];
  const name = record.title || record.fullName;
  if (!window.confirm(`¿Eliminar "${name}"?`)) return;
  const message = document.querySelector(`#${entity}-message`);
  try {
    await request(`mutation Delete($id: ID!) { ${config.remove}(id: $id) { id } }`, { id: record.id });
    showMessage(message, `Se eliminó el ${config.label}.`);
    await loadRecords(entity);
  } catch (error) {
    showMessage(message, error.message, true);
  }
}

function setSelectOptions(select, items, placeholder, getLabel) {
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach((item) => select.add(new Option(getLabel(item), item.id)));
}

function renderBookCopies(inventory) {
  document.querySelector('#copies-total').textContent = formatNumber(inventory.total);
  document.querySelector('#copies-available').textContent = formatNumber(inventory.available);
  document.querySelector('#copies-loaned').textContent = formatNumber(inventory.loaned);
  document.querySelector('#copies-maintenance').textContent = formatNumber(inventory.maintenance);
  const tbody = document.querySelector('#copies-list');
  tbody.replaceChildren();
  if (!inventory.items.length) {
    renderEmpty(tbody, 2, 'Este libro aún no tiene ejemplares físicos.');
    return;
  }
  const labels = { available: 'Disponible', loaned: 'Prestado', maintenance: 'Mantenimiento' };
  inventory.items.forEach((copy) => {
    const row = document.createElement('tr');
    appendCell(row, copy.inventoryCode);
    const status = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = `status-pill ${copy.status}`;
    pill.textContent = labels[copy.status] || copy.status;
    status.appendChild(pill);
    row.appendChild(status);
    tbody.appendChild(row);
  });
}

async function loadBookCopies() {
  const book = state.managedBook;
  if (!book) return;
  const message = document.querySelector('#copies-message');
  const button = document.querySelector('#add-copy-button');
  button.disabled = true;
  showMessage(message, 'Consultando ejemplares…');
  try {
    const data = await request(`query BookCopies($bookId: ID!) {
      bookCopies(bookId: $bookId) {
        items { id inventoryCode status }
        total available loaned maintenance
      }
    }`, { bookId: book.id });
    renderBookCopies(data.bookCopies);
    showMessage(message, '');
  } catch (error) {
    showMessage(message, error.message, true);
    renderEmpty(document.querySelector('#copies-list'), 2, 'No se pudieron consultar los ejemplares.');
  } finally {
    button.disabled = false;
  }
}

async function openBookCopiesDialog(book) {
  state.managedBook = book;
  document.querySelector('#copies-book-title').textContent = `${book.title} · ${book.author}`;
  document.querySelector('#copies-dialog').showModal();
  await loadBookCopies();
}

async function addManagedCopy() {
  if (!state.managedBook) return;
  const button = document.querySelector('#add-copy-button');
  button.disabled = true;
  showMessage(document.querySelector('#copies-message'), 'Registrando ejemplar…');
  try {
    const data = await request(`mutation AddBookCopy($bookId: ID!) {
      addBookCopy(bookId: $bookId) { id inventoryCode status }
    }`, { bookId: state.managedBook.id });
    await loadBookCopies();
    showMessage(document.querySelector('#copies-message'),
      `Ejemplar ${data.addBookCopy.inventoryCode} registrado y disponible.`);
    if (document.querySelector('#loan-dialog').open
        && document.querySelector('#loan-book-select').value === state.managedBook.id) {
      await loadAvailableCopies(state.managedBook.id);
    }
  } catch (error) {
    showMessage(document.querySelector('#copies-message'), error.message, true);
  } finally {
    button.disabled = false;
  }
}

function updateLoanSubmitState() {
  const bookId = document.querySelector('#loan-book-select').value;
  const copySelect = document.querySelector('#loan-copy-select');
  const copyId = copySelect.value;
  const userId = document.querySelector('#loan-user-select').value;
  const isObjectId = (value) => /^[\da-f]{24}$/i.test(value);
  document.querySelector('#loan-submit').disabled =
    copySelect.disabled || !isObjectId(bookId) || !isObjectId(copyId) || !isObjectId(userId);
}

async function loadLoanBooks(search) {
  const requestId = ++state.optionRequestIds.books;
  const select = document.querySelector('#loan-book-select');
  setSelectOptions(select, [], 'Buscando libros…', () => '');
  try {
    const data = await request(`query LoanBooks($search: String, $page: Int!, $pageSize: Int!) {
      booksPage(search: $search, page: $page, pageSize: $pageSize) {
        items { id title author isbn }
      }
    }`, { search: search || null, page: 1, pageSize: 50 });
    if (requestId !== state.optionRequestIds.books) return;
    const books = data.booksPage.items.map((book) => ({ ...book, id: book.id }));
    setSelectOptions(select, books, books.length ? 'Selecciona un libro' : 'No hay coincidencias', (book) =>
      `${book.title} — ${book.author} (${book.isbn})`);
    updateLoanSubmitState();
  } catch (error) {
    if (requestId === state.optionRequestIds.books) {
      setSelectOptions(select, [], 'No se pudieron cargar libros', () => '');
      showMessage(document.querySelector('#loan-form-message'), error.message, true);
    }
  }
}

async function loadLoanUsers(search) {
  const requestId = ++state.optionRequestIds.users;
  const select = document.querySelector('#loan-user-select');
  setSelectOptions(select, [], 'Buscando usuarios…', () => '');
  try {
    const data = await request(`query LoanUsers($search: String, $page: Int!, $pageSize: Int!) {
      usersPage(search: $search, page: $page, pageSize: $pageSize) {
        items { id fullName email }
      }
    }`, { search: search || null, page: 1, pageSize: 50 });
    if (requestId !== state.optionRequestIds.users) return;
    setSelectOptions(select, data.usersPage.items, data.usersPage.items.length ? 'Selecciona un usuario' : 'No hay coincidencias', (user) =>
      `${user.fullName} — ${user.email}`);
    updateLoanSubmitState();
  } catch (error) {
    if (requestId === state.optionRequestIds.users) {
      setSelectOptions(select, [], 'No se pudieron cargar usuarios', () => '');
      showMessage(document.querySelector('#loan-form-message'), error.message, true);
    }
  }
}

async function loadAvailableCopies(bookId) {
  const requestId = ++state.optionRequestIds.copies;
  const select = document.querySelector('#loan-copy-select');
  select.disabled = true;
  updateLoanSubmitState();
  setSelectOptions(select, [], 'Buscando ejemplares disponibles…', () => '');
  if (!bookId) {
    setSelectOptions(select, [], 'Selecciona un libro primero', () => '');
    showMessage(document.querySelector('#loan-form-message'), '');
    return;
  }
  showMessage(document.querySelector('#loan-form-message'), '');
  try {
    const data = await request(`query AvailableCopies($bookId: ID!) {
      availableCopiesForBook(bookId: $bookId) { id inventoryCode }
    }`, { bookId });
    if (requestId !== state.optionRequestIds.copies) return;
    const copies = data.availableCopiesForBook;
    setSelectOptions(select, copies, copies.length ? 'Selecciona un ejemplar' : 'No hay ejemplares disponibles', (copy) =>
      copy.inventoryCode);
    select.disabled = copies.length === 0;
    if (!copies.length) {
      showMessage(document.querySelector('#loan-form-message'),
        'Este libro no tiene ejemplares disponibles. Registra uno desde Gestionar ejemplares o selecciona otro libro.',
        true);
    }
    updateLoanSubmitState();
  } catch (error) {
    if (requestId === state.optionRequestIds.copies) {
      setSelectOptions(select, [], 'No se pudieron cargar ejemplares', () => '');
      showMessage(document.querySelector('#loan-form-message'), error.message, true);
      updateLoanSubmitState();
    }
  }
}

function resetLoanForm() {
  const form = document.querySelector('#loan-form');
  form.reset();
  const today = localDateValue();
  document.querySelector('#loan-date').value = today;
  document.querySelector('#loan-due-date').value = addDaysToDate(today, 14);
  const copySelect = document.querySelector('#loan-copy-select');
  copySelect.disabled = true;
  setSelectOptions(document.querySelector('#loan-book-select'), [], 'Escribe para buscar libros', () => '');
  setSelectOptions(copySelect, [], 'Selecciona un libro primero', () => '');
  setSelectOptions(document.querySelector('#loan-user-select'), [], 'Escribe para buscar usuarios', () => '');
  document.querySelector('#loan-submit').disabled = true;
  showMessage(document.querySelector('#loan-form-message'), '');
}

async function openLoanDialog() {
  resetLoanForm();
  document.querySelector('#loan-dialog').showModal();
  await Promise.all([loadLoanBooks(''), loadLoanUsers('')]);
}

function daysLateForDate(loan, returnDate) {
  if (!returnDate) return 0;
  const due = Date.parse(`${loan.dueDate.slice(0, 10)}T00:00:00.000Z`);
  const returned = Date.parse(`${returnDate}T00:00:00.000Z`);
  return Number.isFinite(due) && Number.isFinite(returned) ? Math.max(0, Math.floor((returned - due) / 86400000)) : 0;
}

function renderReturnSummary(loan) {
  const summary = document.querySelector('#return-summary');
  summary.replaceChildren();
  if (!loan) {
    const empty = document.createElement('p');
    empty.textContent = 'Selecciona un préstamo para revisar sus datos.';
    summary.appendChild(empty);
    return;
  }
  const items = [
    ['Libro', loan.title],
    ['Usuario', loan.userName],
    ['Código de inventario', loan.inventoryCode],
    ['Fecha del préstamo', formatDate(loan.loanDate)],
    ['Fecha límite', formatDate(loan.dueDate)],
    ['Fecha de devolución', formatDate(document.querySelector('#return-date').value)],
    ['Retraso estimado', daysLateForDate(loan, document.querySelector('#return-date').value) ? `${daysLateForDate(loan, document.querySelector('#return-date').value)} días` : 'Sin retraso']
  ];
  const grid = document.createElement('div');
  grid.className = 'summary-grid';
  items.forEach(([label, value], index) => {
    const field = document.createElement('div');
    const caption = document.createElement('span');
    caption.textContent = label;
    const text = document.createElement('strong');
    text.textContent = value || '—';
    if (index === items.length - 1 && daysLateForDate(loan, document.querySelector('#return-date').value)) {
      text.className = 'late-summary';
    }
    field.append(caption, text);
    grid.appendChild(field);
  });
  summary.appendChild(grid);
}

async function loadPendingLoanOptions(search, selectedLoan = null) {
  const requestId = ++state.optionRequestIds.pending;
  const select = document.querySelector('#return-loan-select');
  setSelectOptions(select, [], 'Buscando préstamos pendientes…', () => '');
  try {
    const data = await request(`query PendingLoans($search: String, $page: Int!, $pageSize: Int!) {
      pendingLoansPage(search: $search, page: $page, pageSize: $pageSize) {
        items { loanId title author userName email inventoryCode loanDate dueDate returnDate status daysRemaining daysOverdue }
      }
    }`, { search: search || null, page: 1, pageSize: 50 });
    if (requestId !== state.optionRequestIds.pending) return;
    state.pendingLoans = data.pendingLoansPage.items;
    if (selectedLoan && !state.pendingLoans.some((loan) => loan.loanId === selectedLoan.loanId)) {
      state.pendingLoans.unshift(selectedLoan);
    }
    setSelectOptions(select, state.pendingLoans.map((loan) => ({ ...loan, id: loan.loanId })),
      state.pendingLoans.length ? 'Selecciona un préstamo' : 'No hay préstamos pendientes',
      (loan) => `${loan.title} — ${loan.userName} — ${loan.inventoryCode} (${loan.status === 'overdue' ? 'vencido' : 'activo'})`);
    if (selectedLoan) select.value = selectedLoan.loanId;
    select.dispatchEvent(new Event('change'));
  } catch (error) {
    if (requestId === state.optionRequestIds.pending) {
      setSelectOptions(select, [], 'No se pudieron cargar préstamos', () => '');
      showMessage(document.querySelector('#return-form-message'), error.message, true);
    }
  }
}

async function openReturnDialog(selectedLoan = null) {
  const form = document.querySelector('#return-form');
  form.reset();
  document.querySelector('#return-date').value = localDateValue();
  document.querySelector('#return-submit').disabled = true;
  showMessage(document.querySelector('#return-form-message'), '');
  renderReturnSummary(null);
  document.querySelector('#return-dialog').showModal();
  await loadPendingLoanOptions('', selectedLoan);
}

async function refreshAfterCirculationChange() {
  state.pages.loans.page = 1;
  state.pages.returns.page = 1;
  const results = await Promise.all([loadDashboard(true), loadLoans(), loadReturns()]);
  return results.every(Boolean);
}

async function submitLoan(event) {
  event.preventDefault();
  const submit = document.querySelector('#loan-submit');
  const loanDate = document.querySelector('#loan-date').value;
  const dueDate = document.querySelector('#loan-due-date').value;
  const bookId = document.querySelector('#loan-book-select').value;
  const copyId = document.querySelector('#loan-copy-select').value;
  const userId = document.querySelector('#loan-user-select').value;
  const isObjectId = (value) => /^[\da-f]{24}$/i.test(value);
  if (!isObjectId(bookId) || !isObjectId(copyId) || !isObjectId(userId)
      || document.querySelector('#loan-copy-select').disabled) {
    showMessage(document.querySelector('#loan-form-message'),
      'Selecciona un libro, un ejemplar disponible y un usuario antes de continuar.', true);
    updateLoanSubmitState();
    return;
  }
  if (dueDate <= loanDate) {
    showMessage(document.querySelector('#loan-form-message'), 'La fecha límite debe ser posterior a la fecha del préstamo.', true);
    return;
  }
  const book = document.querySelector('#loan-book-select').selectedOptions[0]?.textContent || '';
  const user = document.querySelector('#loan-user-select').selectedOptions[0]?.textContent || '';
  const copy = document.querySelector('#loan-copy-select').selectedOptions[0]?.textContent || '';
  if (!window.confirm(`¿Registrar el préstamo de ${book} para ${user} con el ejemplar ${copy}?`)) return;
  submit.disabled = true;
  showMessage(document.querySelector('#loan-form-message'), 'Registrando préstamo…');
  try {
    await request(`mutation RegisterLoan($input: NewLoanInput!) {
      registerLoan(input: $input) { loanId status copyStatus loanDate dueDate returnDate }
    }`, {
      input: {
        bookId,
        copyId,
        userId,
        loanDate,
        dueDate
      }
    });
    document.querySelector('#loan-dialog').close();
    resetLoanForm();
    const refreshed = await refreshAfterCirculationChange();
    showMessage(document.querySelector('#loan-operation-message'), refreshed
      ? 'Préstamo registrado correctamente.'
      : 'Préstamo registrado, pero alguna vista no se pudo actualizar. Usa Actualizar para volver a consultar.',
    !refreshed);
  } catch (error) {
    showMessage(document.querySelector('#loan-form-message'), error.message, true);
  } finally {
    updateLoanSubmitState();
  }
}

async function submitReturn(event) {
  event.preventDefault();
  const loanId = document.querySelector('#return-loan-select').value;
  const loan = state.pendingLoans.find((item) => item.loanId === loanId);
  const returnDate = document.querySelector('#return-date').value;
  if (!loan) {
    showMessage(document.querySelector('#return-form-message'), 'Selecciona un préstamo pendiente.', true);
    return;
  }
  if (returnDate < loan.loanDate.slice(0, 10)) {
    showMessage(document.querySelector('#return-form-message'), 'La fecha de devolución no puede ser anterior a la fecha del préstamo.', true);
    return;
  }
  if (returnDate > localDateValue()) {
    showMessage(document.querySelector('#return-form-message'), 'La fecha de devolución no puede ser futura.', true);
    return;
  }
  const lateDays = daysLateForDate(loan, returnDate);
  if (!window.confirm(`¿Confirmar la devolución de "${loan.title}" por ${loan.userName}${lateDays ? ` con ${lateDays} días de retraso` : ''}?`)) return;
  const submit = document.querySelector('#return-submit');
  submit.disabled = true;
  showMessage(document.querySelector('#return-form-message'), 'Registrando devolución…');
  try {
    await request(`mutation RegisterReturn($loanId: ID!, $returnDate: String!) {
      registerReturn(loanId: $loanId, returnDate: $returnDate) {
        loanId status copyStatus loanDate dueDate returnDate
      }
    }`, { loanId, returnDate });
    document.querySelector('#return-dialog').close();
    const refreshed = await refreshAfterCirculationChange();
    showMessage(document.querySelector('#return-operation-message'), refreshed
      ? 'Devolución registrada correctamente.'
      : 'Devolución registrada, pero alguna vista no se pudo actualizar. Usa Actualizar para volver a consultar.',
    !refreshed);
  } catch (error) {
    showMessage(document.querySelector('#return-form-message'), error.message, true);
  } finally {
    submit.disabled = false;
  }
}

function debounce(key, callback, delay = 250) {
  clearTimeout(state.timers[key]);
  state.timers[key] = setTimeout(callback, delay);
}

function resetToFirstPage(key, loader) {
  state.pages[key].page = 1;
  loader();
}

function loadCurrentPagedView(key) {
  if (key === 'books' || key === 'users') loadRecords(key);
  if (key === 'loans') loadLoans();
  if (key === 'returns') loadReturns();
}

function setupPagination(key) {
  document.querySelector(`#${key}-previous`).addEventListener('click', () => {
    if (state.pages[key].page > 1) {
      state.pages[key].page -= 1;
      loadCurrentPagedView(key);
    }
  });
  document.querySelector(`#${key}-next`).addEventListener('click', () => {
    if (state.pages[key].page < state.pages[key].totalPages) {
      state.pages[key].page += 1;
      loadCurrentPagedView(key);
    }
  });
  document.querySelector(`#${key}-page-size`).addEventListener('change', (event) => {
    state.pages[key].pageSize = Number(event.target.value);
    state.pages[key].page = 1;
    loadCurrentPagedView(key);
  });
}

document.querySelector('#book-form').addEventListener('submit', (event) => saveRecord('books', event));
document.querySelector('#user-form').addEventListener('submit', (event) => saveRecord('users', event));
document.querySelector('#book-cancel').addEventListener('click', () => resetForm('books'));
document.querySelector('#user-cancel').addEventListener('click', () => resetForm('users'));
document.querySelector('#books-search').addEventListener('input', () => debounce('books', () => resetToFirstPage('books', () => loadRecords('books'))));
document.querySelector('#books-genre').addEventListener('change', () => resetToFirstPage('books', () => loadRecords('books')));
document.querySelector('#users-search').addEventListener('input', () => debounce('users', () => resetToFirstPage('users', () => loadRecords('users'))));
document.querySelector('#loans-search').addEventListener('input', () => debounce('loans', () => resetToFirstPage('loans', loadLoans)));
document.querySelector('#loans-status').addEventListener('change', () => resetToFirstPage('loans', loadLoans));
document.querySelector('#returns-search').addEventListener('input', () => debounce('returns', () => resetToFirstPage('returns', loadReturns)));
document.querySelector('#returns-status').addEventListener('change', () => resetToFirstPage('returns', loadReturns));
document.querySelector('#books-list').addEventListener('click', (event) => handleRecordAction('books', event));
document.querySelector('#users-list').addEventListener('click', (event) => handleRecordAction('users', event));
document.querySelector('#loans-list').addEventListener('click', handleReturnAction);
document.querySelector('#returns-list').addEventListener('click', handleReturnAction);
document.querySelector('#loan-form').addEventListener('submit', submitLoan);
document.querySelector('#return-form').addEventListener('submit', submitReturn);
document.querySelector('#loan-book-search').addEventListener('input', () =>
  debounce('loanBookOptions', () => loadLoanBooks(document.querySelector('#loan-book-search').value.trim())));
document.querySelector('#loan-user-search').addEventListener('input', () =>
  debounce('loanUserOptions', () => loadLoanUsers(document.querySelector('#loan-user-search').value.trim())));
document.querySelector('#loan-book-select').addEventListener('change', (event) => loadAvailableCopies(event.target.value));
document.querySelector('#loan-copy-select').addEventListener('change', updateLoanSubmitState);
document.querySelector('#loan-user-select').addEventListener('change', updateLoanSubmitState);
document.querySelector('#return-search').addEventListener('input', () =>
  debounce('pendingLoanOptions', () => loadPendingLoanOptions(document.querySelector('#return-search').value.trim())));
document.querySelector('#return-loan-select').addEventListener('change', (event) => {
  const loan = state.pendingLoans.find((item) => item.loanId === event.target.value);
  document.querySelector('#return-submit').disabled = !loan;
  renderReturnSummary(loan);
});
document.querySelector('#return-date').addEventListener('input', () => {
  const loan = state.pendingLoans.find((item) => item.loanId === document.querySelector('#return-loan-select').value);
  renderReturnSummary(loan);
});
document.querySelector('#open-loan-dialog').addEventListener('click', openLoanDialog);
document.querySelector('#open-return-dialog').addEventListener('click', () => openReturnDialog());
document.querySelector('#add-copy-button').addEventListener('click', addManagedCopy);
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeDialog}`).close());
});
document.querySelectorAll('[data-refresh]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.refresh === 'dashboard') loadDashboard(true);
    if (button.dataset.refresh === 'books') loadRecords('books');
    if (button.dataset.refresh === 'users') loadRecords('users');
    if (button.dataset.refresh === 'loans') loadLoans();
    if (button.dataset.refresh === 'returns') loadReturns();
  });
});

function handleRecordAction(entity, event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const record = state[entity].find((item) => item.id === button.dataset.id);
  if (!record) return;
  if (button.dataset.action === 'edit') beginEdit(entity, record);
  if (button.dataset.action === 'delete') deleteRecord(entity, record);
  if (button.dataset.action === 'copies') openBookCopiesDialog(record);
}

function handleReturnAction(event) {
  const button = event.target.closest('button[data-return-loan-id]');
  if (!button) return;
  const loan = [...state.loans, ...state.returns].find((item) => item.loanId === button.dataset.returnLoanId);
  if (loan) openReturnDialog(loan);
}

for (const key of ['books', 'users', 'loans', 'returns']) setupPagination(key);
window.addEventListener('hashchange', navigate);
navigate();
