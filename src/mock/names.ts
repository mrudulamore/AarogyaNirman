// Fictional Maharashtra-style names for mock data. No real personal information.

export const FIRST_NAMES_M = [
  'Rajendra', 'Sanjay', 'Vikas', 'Prakash', 'Anil', 'Suresh', 'Mahesh', 'Dilip',
  'Rahul', 'Amit', 'Sandeep', 'Vinod', 'Ganesh', 'Ramesh', 'Nitin', 'Ashok',
  'Yogesh', 'Pravin', 'Santosh', 'Kiran', 'Vijay', 'Shrikant', 'Milind', 'Umesh',
];

export const FIRST_NAMES_F = [
  'Sunita', 'Meena', 'Kavita', 'Anjali', 'Priya', 'Sarita', 'Rekha', 'Manisha',
  'Snehal', 'Vaishali', 'Pooja', 'Shalini', 'Neeta', 'Archana', 'Swati', 'Deepa',
];

export const LAST_NAMES = [
  'Deshmukh', 'Patil', 'Kulkarni', 'Joshi', 'Shinde', 'Jadhav', 'More', 'Gaikwad',
  'Pawar', 'Kale', 'Sawant', 'Chavan', 'Bhosale', 'Kadam', 'Salunkhe', 'Wagh',
  'Thorat', 'Rane', 'Gawde', 'Nikam', 'Bagul', 'Ingle', 'Mane', 'Kadu',
];

export function randomFullName(rng: () => number): string {
  const isM = rng() > 0.35;
  const first = isM
    ? FIRST_NAMES_M[Math.floor(rng() * FIRST_NAMES_M.length)]
    : FIRST_NAMES_F[Math.floor(rng() * FIRST_NAMES_F.length)];
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

export const CONTRACTOR_COMPANIES = [
  'Shivneri Infra Projects Pvt. Ltd.', 'Konkan Buildcon Ltd.', 'Sahyadri Construction Co.',
  'Vidarbha Engineering Works', 'Maratha Infrastructure Ltd.', 'Godavari Builders & Contractors',
  'Deccan Civil Constructions', 'Bhima Infra Developers', 'Krishna Valley Constructions Pvt. Ltd.',
  'Ajanta Infraprojects Ltd.', 'Panchganga Buildtech', 'Tapi Engineering & Construction',
  'Western Ghats Infra Ltd.', 'Purna Constructions Pvt. Ltd.', 'Wardha Civil Works Ltd.',
];

export const PMC_FIRMS = [
  'Statecon Project Management Services', 'Nirmiti PMC Pvt. Ltd.', 'Bandhkam Consultants Ltd.',
  'Urja Infra Advisory', 'Setu Engineering Consultants',
];

export function seedRng(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
