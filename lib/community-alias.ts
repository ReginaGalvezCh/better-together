// Short romanized sounds and Spanish/English pop-inspired words. These are
// playful aliases, not verified names, translations, unique IDs or accounts.
const firstWords = ["Bora", "Hana", "Dal", "Nabi", "Sora", "Nube", "Luna", "Sol", "Purple", "Neon", "Cherry", "Cosmic"];
const lastWords = ["Beat", "Pop", "Disco", "Star", "Brillo", "Ritmo", "Moon", "Glow", "Idol", "Encore"];

export function randomCommunityAlias(previous = "", random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  const first = firstWords[random() % firstWords.length];
  const last = lastWords[random() % lastWords.length];
  let number = random() % 100;
  const candidate = () => `${first} ${last}${String(number).padStart(2, "0")}`;
  if (candidate() === previous) number = (number + 1) % 100;
  return candidate();
}
