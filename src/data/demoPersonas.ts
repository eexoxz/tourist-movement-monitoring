// Fictional identities only; contact addresses use a reserved example domain.
const origins = [
  ["Malaysia", ["Aina", "Farah", "Amir", "Hakim", "Nadia"], ["Rahman", "Ismail", "Hassan", "Aziz", "Yusof"]],
  ["Indonesia", ["Dewi", "Aditya", "Intan", "Bayu", "Sari"], ["Pratama", "Wijaya", "Santoso", "Saputra", "Putri"]],
  ["Singapore", ["Chloe", "Marcus", "Ethan", "Rachel", "Nicole"], ["Tan", "Lim", "Lee", "Ng", "Ong"]],
  ["Thailand", ["Narin", "Kanya", "Anan", "Siriporn", "Pim"], ["Srisai", "Chaiyaporn", "Wongchai", "Sukjai", "Saetang"]],
  ["Japan", ["Haruka", "Ren", "Yui", "Kaito", "Aoi"], ["Tanaka", "Sato", "Suzuki", "Yamamoto", "Kobayashi"]],
  ["South Korea", ["Minji", "Jiho", "Yuna", "Seojun", "Hana"], ["Kim", "Park", "Choi", "Jung", "Kang"]],
  ["China", ["Mei", "Jun", "Lin", "Wei", "Jia"], ["Chen", "Zhang", "Liu", "Huang", "Zhao"]],
  ["India", ["Priya", "Arjun", "Ananya", "Rohan", "Kavya"], ["Sharma", "Patel", "Nair", "Rao", "Mehta"]],
  ["United Kingdom", ["Oliver", "Amelia", "Harry", "Sophie", "Jack"], ["Bennett", "Clarke", "Evans", "Turner", "Wilson"]],
  ["Australia", ["Charlotte", "Noah", "Isla", "Liam", "Mia"], ["Cooper", "Walker", "Harris", "Mitchell", "Campbell"]],
  ["Germany", ["Lena", "Jonas", "Emma", "Felix", "Hannah"], ["Schmidt", "Weber", "Fischer", "Wagner", "Becker"]],
  ["France", ["Camille", "Lucas", "Manon", "Hugo", "Lea"], ["Martin", "Bernard", "Dubois", "Laurent", "Moreau"]],
] as const;

export function demoRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function demoPersona(index: number) {
  const [nationality, givenNames, familyNames] = origins[index % origins.length];
  const combination = (Math.floor(index / origins.length) * 13 + 7) % 25;
  const name = `${givenNames[combination % 5]} ${familyNames[Math.floor(combination / 5)]}`;
  const contact = `${givenNames[(combination + 2) % 5]} ${familyNames[Math.floor(combination / 5)]}`;
  return { name, nationality, contact, email: `${name.toLowerCase().replaceAll(" ", ".")}.${index + 1}@example.com` };
}
