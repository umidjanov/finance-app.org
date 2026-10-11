const sharp = require("sharp");
const fs = require("fs");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync("./public/icons")) {
  fs.mkdirSync("./public/icons", { recursive: true });
}

sizes.forEach((size) => {
  sharp("./public/logo512.png")
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}x${size}.png`, (err) => {
      if (err) {
        console.log(`Xato ${size}x${size}:`, err.message);
      } else {
        console.log(`✅ Yaratildi: icon-${size}x${size}.png`);
      }
    });
});
