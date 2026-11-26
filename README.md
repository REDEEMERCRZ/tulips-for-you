# Tulips For You

A small animated gift made with vanilla HTML, CSS, and JavaScript. Open the sealed envelope, read the letter, and press its surprise button to start the ASCII tulip animation. Tap the letter to finish typing immediately. In the bouquet scene, tap or click to release hearts, select **Replay** to watch the flowers grow again, or choose **Back to the beginning ♡** to close the envelope and start over.

## Open it locally

Open `index.html` in a browser. Keep `style.css` and `script.js` in the same folder. Everything works offline.

If XAMPP’s Apache is running and the project is in `htdocs/TULIPS`, open [the local Apache preview](http://localhost/TULIPS/). You can also start PHP’s development server from the project folder and open [the standalone preview](http://127.0.0.1:8765/).

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8765
```

## Personalize the gift

Find `CONFIG` at the top of `script.js`, make your edits, and reload the page.

| Setting | What it changes |
| --- | --- |
| `letter.recipient` | The name inserted wherever `{recipient}` appears in your text. |
| `letter.sender` | The sender's name. Put `{sender}` where you want it, or leave that placeholder out to append the name at the end of the letter. An empty sender leaves the letter unsigned. |
| `letter.greeting` and `letter.message` | The envelope greeting and letter. Keep the letter inside backticks to preserve its line breaks, and save the file as UTF-8. |
| `letter.envelopeColor` and `letter.sealColor` | The stationery colors, as six-digit hex values such as `#e6a9bd`. |
| `letter.typingSpeed` | Letter characters per second. |
| `letter.surpriseButton` | The text on the button that opens the bouquet. |
| `messages.title` | The animated heading below the bouquet. |
| `flowerCount` | The number of tulips, from 1 to 12. The default arrangement has seven. |
| `flowerColors` | Each palette accepts three six-digit hex colors in order from shadow to midtone to highlight. The flower layouts use the named palettes. |
| `animation.introSpeed` | Speed of the whole introduction. `1` is the default and `1.25` makes it 25% faster. |
| `animation.typingSpeed` | Typewriter speed relative to the introduction speed. |
| `animation.titleAt` | How many seconds into the introduction the heading starts at normal speed. |
| `animation.swaySpeed` and `animation.particleSpeed` | Speed multipliers for the bouquet’s motion and the drifting hearts and sparks. |

The page follows your device’s reduced-motion setting. With reduced motion enabled, each interaction still opens its scene, and the letter and completed bouquet appear instantly. Tap hearts appear briefly in place.

## Publish it for free

Create a project with a free static hosting provider and upload `index.html`, `style.css`, and `script.js` together. Select the folder containing `index.html` as the publish directory and leave the build command empty. Once the host serves the page, open its HTTPS link to check the animation before sharing it.
