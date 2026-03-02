function buildCardPrompt({ style, description, greetingText }) {
  return [
    `Style: ${style}.`,
    description,
    "Place the logo from the last reference image in the bottom-right corner, small and unobtrusive.",
    "Do not distort or reinterpret the logo.",
    `Write this text beautifully on the card: «${greetingText}»`
  ].join(" ");
}

module.exports = {
  buildCardPrompt
};
