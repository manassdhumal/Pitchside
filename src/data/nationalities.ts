export interface NationalityPool {
  code: string;
  name: string;
  firstNames: string[];
  lastNames: string[];
}

// Fictional name pools, loosely styled by region for plausibility.
// Not sourced from any real player/roster database.
export const NATIONALITIES: NationalityPool[] = [
  {
    code: 'ENG',
    name: 'England',
    firstNames: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Thomas', 'James', 'William', 'Callum', 'Reece'],
    lastNames: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Wright', 'Hughes', 'Foster'],
  },
  {
    code: 'BRA',
    name: 'Brazil',
    firstNames: ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Thiago', 'Diego', 'Vinicius', 'Caio', 'Andre'],
    lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Barbosa'],
  },
  {
    code: 'ESP',
    name: 'Spain',
    firstNames: ['Alvaro', 'Pablo', 'Sergio', 'Diego', 'Adrian', 'Marcos', 'Ivan', 'Hugo', 'Mario', 'Rodrigo'],
    lastNames: ['Garcia', 'Fernandez', 'Lopez', 'Martinez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Torres', 'Navarro'],
  },
  {
    code: 'GER',
    name: 'Germany',
    firstNames: ['Lukas', 'Jonas', 'Finn', 'Maximilian', 'Felix', 'Niklas', 'Tobias', 'Julian', 'Elias', 'Moritz'],
    lastNames: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Richter', 'Klein'],
  },
  {
    code: 'FRA',
    name: 'France',
    firstNames: ['Lucas', 'Hugo', 'Leo', 'Louis', 'Nathan', 'Enzo', 'Mathis', 'Gabriel', 'Rayan', 'Ethan'],
    lastNames: ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon'],
  },
  {
    code: 'ARG',
    name: 'Argentina',
    firstNames: ['Nicolas', 'Franco', 'Tomas', 'Ezequiel', 'Facundo', 'Ignacio', 'Santiago', 'Agustin', 'Federico', 'Joaquin'],
    lastNames: ['Gonzalez', 'Rodriguez', 'Fernandez', 'Lopez', 'Diaz', 'Martinez', 'Sosa', 'Romero', 'Alvarez', 'Molina'],
  },
  {
    code: 'ITA',
    name: 'Italy',
    firstNames: ['Matteo', 'Lorenzo', 'Andrea', 'Davide', 'Francesco', 'Riccardo', 'Simone', 'Alessandro', 'Marco', 'Federico'],
    lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'],
  },
  {
    code: 'NGA',
    name: 'Nigeria',
    firstNames: ['Chidi', 'Emeka', 'Uche', 'Ifeanyi', 'Kelechi', 'Chukwuma', 'Obinna', 'Tunde', 'Segun', 'Femi'],
    lastNames: ['Okafor', 'Eze', 'Nwosu', 'Adeyemi', 'Balogun', 'Okonkwo', 'Chukwu', 'Ibrahim', 'Bello', 'Okoye'],
  },
  {
    code: 'JPN',
    name: 'Japan',
    firstNames: ['Haruto', 'Yuto', 'Sota', 'Ren', 'Kaito', 'Riku', 'Sho', 'Daiki', 'Yuki', 'Takumi'],
    lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Saito'],
  },
  {
    code: 'USA',
    name: 'United States',
    firstNames: ['Tyler', 'Jordan', 'Ethan', 'Cameron', 'Mason', 'Aiden', 'Brandon', 'Justin', 'Ricardo', 'Kevin'],
    lastNames: ['Johnson', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Jackson'],
  },
  {
    code: 'POR',
    name: 'Portugal',
    firstNames: ['Joao', 'Tiago', 'Rui', 'Bruno', 'Nuno', 'Goncalo', 'Andre', 'Ricardo', 'Miguel', 'Diogo'],
    lastNames: ['Silva', 'Costa', 'Pereira', 'Ferreira', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Teixeira', 'Fonseca'],
  },
  {
    code: 'NED',
    name: 'Netherlands',
    firstNames: ['Daan', 'Sem', 'Bram', 'Luuk', 'Milan', 'Thijs', 'Wouter', 'Stijn', 'Jesse', 'Dave'],
    lastNames: ['de Jong', 'Bakker', 'Visser', 'Smit', 'de Boer', 'Mulder', 'Dekker', 'Bos', 'van Dijk', 'Peters'],
  },
  {
    code: 'BEL',
    name: 'Belgium',
    firstNames: ['Lucas', 'Arthur', 'Louis', 'Noah', 'Liam', 'Victor', 'Alexandre', 'Maxime', 'Simon', 'Thomas'],
    lastNames: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Michiels'],
  },
  {
    code: 'CRO',
    name: 'Croatia',
    firstNames: ['Ivan', 'Marko', 'Luka', 'Ante', 'Josip', 'Filip', 'Toni', 'Dario', 'Mislav', 'Domagoj'],
    lastNames: ['Horvat', 'Kovacevic', 'Babic', 'Maric', 'Juric', 'Kovac', 'Peric', 'Vidovic', 'Novak', 'Barisic'],
  },
  {
    code: 'POL',
    name: 'Poland',
    firstNames: ['Jakub', 'Szymon', 'Kacper', 'Filip', 'Bartosz', 'Mateusz', 'Wojciech', 'Piotr', 'Michal', 'Tomasz'],
    lastNames: ['Nowak', 'Kowalski', 'Wojcik', 'Kaminski', 'Lewandowski', 'Zielinski', 'Wozniak', 'Dabrowski', 'Kozlowski', 'Mazur'],
  },
  {
    code: 'SWE',
    name: 'Sweden',
    firstNames: ['Erik', 'Lars', 'Anders', 'Johan', 'Karl', 'Oskar', 'Viktor', 'Gustav', 'Emil', 'Fredrik'],
    lastNames: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson'],
  },
  {
    code: 'DEN',
    name: 'Denmark',
    firstNames: ['Mads', 'Lasse', 'Christian', 'Anders', 'Frederik', 'Jonas', 'Nikolaj', 'Rasmus', 'Peter', 'Emil'],
    lastNames: ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sorensen', 'Rasmussen', 'Petersen'],
  },
  {
    code: 'TUR',
    name: 'Turkey',
    firstNames: ['Mehmet', 'Emre', 'Burak', 'Cem', 'Kaan', 'Ozan', 'Serkan', 'Baris', 'Onur', 'Volkan'],
    lastNames: ['Yilmaz', 'Kaya', 'Demir', 'Sahin', 'Celik', 'Yildiz', 'Aydin', 'Ozturk', 'Arslan', 'Dogan'],
  },
  {
    code: 'KOR',
    name: 'South Korea',
    firstNames: ['Min-jun', 'Ji-ho', 'Seung-woo', 'Jun-ho', 'Tae-yang', 'Hyun-woo', 'Dong-hyun', 'Jae-min', 'Sung-min', 'Woo-jin'],
    lastNames: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Han'],
  },
  {
    code: 'MEX',
    name: 'Mexico',
    firstNames: ['Jose', 'Luis', 'Carlos', 'Miguel', 'Alejandro', 'Fernando', 'Emiliano', 'Rodrigo', 'Sebastian', 'Diego'],
    lastNames: ['Hernandez', 'Gonzalez', 'Ramirez', 'Flores', 'Vazquez', 'Reyes', 'Morales', 'Jimenez', 'Ruiz', 'Ortiz'],
  },
  {
    code: 'COL',
    name: 'Colombia',
    firstNames: ['Andres', 'Camilo', 'Julian', 'Esteban', 'Mateo', 'Cristian', 'Jhon', 'Yeison', 'Wilmer', 'Duvan'],
    lastNames: ['Ramirez', 'Gomez', 'Rojas', 'Cardona', 'Zapata', 'Marin', 'Cadavid', 'Palacios', 'Mosquera', 'Cordoba'],
  },
  {
    code: 'URY',
    name: 'Uruguay',
    firstNames: ['Mathias', 'Nahitan', 'Rodrigo', 'Sebastian', 'Federico', 'Gaston', 'Maximiliano', 'Agustin', 'Bruno', 'Nicolas'],
    lastNames: ['Rodriguez', 'Perez', 'Suarez', 'Fernandez', 'Gimenez', 'Correa', 'Acosta', 'Cabrera', 'Ledesma', 'Silva'],
  },
  {
    code: 'CHL',
    name: 'Chile',
    firstNames: ['Matias', 'Cristobal', 'Vicente', 'Benjamin', 'Alexis', 'Gary', 'Eduardo', 'Charles', 'Arturo', 'Claudio'],
    lastNames: ['Bravo', 'Vidal', 'Medel', 'Aranguiz', 'Isla', 'Vargas', 'Diaz', 'Fuentes', 'Pizarro', 'Sanchez'],
  },
  {
    code: 'SEN',
    name: 'Senegal',
    firstNames: ['Sadio', 'Idrissa', 'Kalidou', 'Ismaila', 'Cheikhou', 'Pape', 'Bouna', 'Abdou', 'Mame', 'Moussa'],
    lastNames: ['Diouf', 'Sarr', 'Ndiaye', 'Diallo', 'Gueye', 'Faye', 'Diop', 'Ba', 'Mbaye', 'Cisse'],
  },
  {
    code: 'GHA',
    name: 'Ghana',
    firstNames: ['Kwame', 'Kofi', 'Yaw', 'Kwabena', 'Kojo', 'Emmanuel', 'Samuel', 'Isaac', 'Daniel', 'Richmond'],
    lastNames: ['Asante', 'Boateng', 'Owusu', 'Mensah', 'Appiah', 'Agyeman', 'Osei', 'Amoah', 'Danso', 'Baffour'],
  },
  {
    code: 'CMR',
    name: 'Cameroon',
    firstNames: ['Samuel', 'Andre', 'Vincent', 'Joel', 'Christian', 'Eric', 'Jean', 'Patrick', 'Frank', 'Franck'],
    lastNames: ['Eto', 'Song', 'Onana', 'Mbia', 'Ngamaleu', 'Zambo', 'Toko', 'Nkoulou', 'Ekambi', 'Choupo'],
  },
  {
    code: 'CIV',
    name: "Ivory Coast",
    firstNames: ['Yaya', 'Kolo', 'Didier', 'Gervinho', 'Serge', 'Wilfried', 'Franck', 'Max', 'Eric', 'Ibrahim'],
    lastNames: ['Toure', 'Kone', 'Bailly', 'Zaha', 'Aurier', 'Gradel', 'Kessie', 'Bony', 'Sanogo', 'Doumbia'],
  },
  {
    code: 'EGY',
    name: 'Egypt',
    firstNames: ['Mohamed', 'Ahmed', 'Omar', 'Karim', 'Amr', 'Hassan', 'Mahmoud', 'Ali', 'Youssef', 'Tarek'],
    lastNames: ['Salah', 'Hassan', 'Fathy', 'Ashour', 'Kahraba', 'Sobhi', 'Gabr', 'Elneny', 'Trezeguet', 'Marmoush'],
  },
  {
    code: 'MAR',
    name: 'Morocco',
    firstNames: ['Achraf', 'Hakim', 'Youssef', 'Sofyan', 'Noussair', 'Romain', 'Nayef', 'Amine', 'Selim', 'Bilal'],
    lastNames: ['Hakimi', 'Ziyech', 'En-Nesyri', 'Amrabat', 'Mazraoui', 'Saiss', 'Aguerd', 'Boufal', 'Amallah', 'Ounahi'],
  },
  {
    code: 'AUS',
    name: 'Australia',
    firstNames: ['Jack', 'Cooper', 'Riley', 'Harry', 'Lachlan', 'Connor', 'Nathaniel', 'Ajdin', 'Craig', 'Mitchell'],
    lastNames: ['Smith', 'Taylor', 'Wright', 'Nguyen', 'Irvine', 'Souttar', 'Boyle', 'Rowles', 'Goodwin', 'Baccus'],
  },
  {
    code: 'CHN',
    name: 'China',
    firstNames: ['Wei', 'Jun', 'Hao', 'Lei', 'Feng', 'Tao', 'Bo', 'Peng', 'Xin', 'Yong'],
    lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu'],
  },
  {
    code: 'KSA',
    name: 'Saudi Arabia',
    firstNames: ['Salem', 'Salman', 'Fahad', 'Abdullah', 'Nawaf', 'Yasser', 'Firas', 'Saud', 'Sultan', 'Turki'],
    lastNames: ['Al-Dawsari', 'Al-Faraj', 'Al-Shehri', 'Al-Buraikan', 'Al-Malki', 'Al-Harbi', 'Al-Ghannam', 'Al-Owais', 'Al-Amri', 'Al-Bulayhi'],
  },
  {
    code: 'IRN',
    name: 'Iran',
    firstNames: ['Sardar', 'Mehdi', 'Alireza', 'Karim', 'Saeid', 'Ramin', 'Ehsan', 'Vahid', 'Ali', 'Ashkan'],
    lastNames: ['Azmoun', 'Taremi', 'Jahanbakhsh', 'Ansarifard', 'Ezatolahi', 'Rezaeian', 'Hajsafi', 'Amiri', 'Dejagah', 'Ghoddos'],
  },
];

export function randomNationality(): NationalityPool {
  return NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
}
