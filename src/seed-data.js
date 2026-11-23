const RECORD_COUNT = 1000;

const titleForms = [
  'Cartografía de',
  'El archivo de',
  'La estación de',
  'Cuadernos sobre',
  'La memoria de',
  'Historias del',
  'El jardín de',
  'Crónicas de',
  'La ruta hacia',
  'Voces desde',
  'El horizonte de',
  'Bitácora de',
  'El invierno de',
  'La biblioteca de',
  'Secretos del',
  'El último mapa de',
  'La frontera de',
  'Relatos del',
  'La ciudad de',
  'El lenguaje de'
];

const titleSubjects = [
  'las mareas', 'la niebla', 'los astros', 'la frontera', 'el olvido',
  'las semillas', 'el horizonte', 'la montaña', 'los viajeros', 'la memoria',
  'las estaciones', 'el silencio', 'los jardines', 'la luz', 'los puentes',
  'la lluvia', 'los relojes', 'la distancia', 'las voces', 'el puerto',
  'los caminos', 'la piedra', 'las constelaciones', 'el río', 'las cartas',
  'la ciudad', 'los mapas', 'el bosque', 'las islas', 'la noche',
  'los inventos', 'la biblioteca', 'las raíces', 'el viento', 'los retratos',
  'la esperanza', 'las campanas', 'el taller', 'los recuerdos', 'la cosecha',
  'la aventura', 'los secretos', 'la música', 'el regreso', 'las preguntas',
  'la travesía', 'los nombres', 'la casa', 'el tiempo', 'las historias'
];

const givenNames = [
  'Alba', 'Alejandro', 'Amalia', 'Andrés', 'Beatriz', 'Bruno', 'Camila', 'Carmen',
  'Clara', 'Daniel', 'Elena', 'Emilio', 'Eva', 'Felipe', 'Inés', 'Irene', 'Javier',
  'Julia', 'León', 'Lucía', 'Manuel', 'Marina', 'Mateo', 'Nadia', 'Noelia', 'Pablo',
  'Rafael', 'Sara', 'Sergio', 'Teresa', 'Tomás', 'Valeria', 'Violeta', 'Ximena',
  'Adrián', 'Alicia', 'Diana', 'Esteban', 'Gabriela', 'Hugo', 'Isabel', 'Nicolás',
  'Olivia', 'Raúl', 'Renata', 'Samuel', 'Silvia', 'Vicente', 'Yolanda', 'Zoe'
];

const surnames = [
  'Alameda', 'Aranda', 'Beltrán', 'Cabrera', 'Calderón', 'Campos', 'Castañeda',
  'Castillo', 'Cervantes', 'Contreras', 'Delgado', 'Espinosa', 'Ferrer', 'Fuentes',
  'Galván', 'Herrera', 'Ibarra', 'Lagos', 'León', 'Linares', 'Lorenzo', 'Maldonado',
  'Márquez', 'Medina', 'Mendoza', 'Montoya', 'Navarro', 'Noriega', 'Olivares',
  'Paredes', 'Pascual', 'Peña', 'Quiroga', 'Rentería', 'Rivas', 'Robles', 'Salinas',
  'Santana', 'Serrano', 'Solís', 'Téllez', 'Toledo', 'Valdés', 'Varela', 'Vega',
  'Velasco', 'Villalba', 'Zamora', 'Zárate', 'Zúñiga'
];

const genres = [
  'Novela', 'Ciencia ficción', 'Historia', 'Ensayo', 'Poesía', 'Misterio',
  'Literatura infantil', 'Biografía', 'Fantasía', 'Cuento'
];

function createIsbn(index) {
  const body = `978${String(index + 1).padStart(9, '0')}`;
  const checksum = [...body].reduce(
    (sum, digit, position) => sum + Number(digit) * (position % 2 === 0 ? 1 : 3),
    0
  );
  return `${body}${(10 - (checksum % 10)) % 10}`;
}

function createBooksAndUsers() {
  const books = Array.from({ length: RECORD_COUNT }, (_, index) => {
    const form = titleForms[index % titleForms.length];
    const subject = titleSubjects[Math.floor(index / titleForms.length)];
    const authorIndex = (index * 37) % (givenNames.length * surnames.length);
    const authorGivenName = givenNames[authorIndex % givenNames.length];
    const authorSurname = surnames[Math.floor(authorIndex / givenNames.length)];

    return {
      title: `${form} ${subject} · ${String(index + 1).padStart(4, '0')}`,
      author: `${authorGivenName} ${authorSurname}`,
      isbn: createIsbn(index),
      publishedYear: 1950 + ((index * 13) % 77),
      genre: genres[index % genres.length]
    };
  });

  const users = Array.from({ length: RECORD_COUNT }, (_, index) => {
    const firstName = givenNames[index % givenNames.length];
    const firstSurname = surnames[Math.floor(index / givenNames.length) % surnames.length];
    const secondSurname = surnames[(index * 17 + 11) % surnames.length];
    const serial = String(index + 1).padStart(4, '0');

    return {
      fullName: `${firstName} ${firstSurname} ${secondSurname}`,
      email: `lector${serial}@example.test`,
      phone: `+1-202-555-${String(index + 1).padStart(4, '0')}`
    };
  });

  return { books, users };
}

function createCopies(bookDocuments) {
  if (bookDocuments.length !== RECORD_COUNT) {
    throw new Error(`Se requieren ${RECORD_COUNT} libros para crear ejemplares.`);
  }

  return bookDocuments.map((book, index) => ({
    book: book._id,
    inventoryCode: `BIB-${String(index + 1).padStart(6, '0')}`,
    status: index >= 500 && index < 800 ? 'available' : 'loaned'
  }));
}

function createLoans(userDocuments, copyDocuments, today = new Date()) {
  if (userDocuments.length !== RECORD_COUNT || copyDocuments.length !== RECORD_COUNT) {
    throw new Error(`Se requieren ${RECORD_COUNT} usuarios y ejemplares para crear préstamos.`);
  }

  return copyDocuments.map((copy, index) => {
    const loanDate = new Date(today);
    const isActive = index < 500;
    const isReturned = index >= 500 && index < 800;
    const daysAgo = isActive ? 3 + (index % 20) : isReturned ? 30 + (index % 120) : 25 + (index % 90);
    loanDate.setUTCDate(loanDate.getUTCDate() - daysAgo);

    const dueDate = new Date(loanDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);

    let status;
    let returnDate = null;
    if (isActive) {
      status = 'active';
      dueDate.setTime(today.getTime());
      dueDate.setUTCDate(today.getUTCDate() + 7 + (index % 14));
    } else if (isReturned) {
      status = 'returned';
      returnDate = new Date(loanDate);
      returnDate.setUTCDate(returnDate.getUTCDate() + 5 + (index % 25));
    } else {
      status = 'overdue';
    }

    return {
      user: userDocuments[(index * 37) % userDocuments.length]._id,
      copy: copy._id,
      loanDate,
      dueDate,
      returnDate,
      status
    };
  });
}

module.exports = {
  RECORD_COUNT,
  createBooksAndUsers,
  createCopies,
  createLoans
};
