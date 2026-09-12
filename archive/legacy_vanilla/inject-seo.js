const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/HP/Documents/Nive';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const tagsToInject = `
  <meta name="description" content="Nive - A premium reading experience." />
  <meta name="theme-color" content="#050505" />
  <link rel="icon" type="image/png" href="assets/logos/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already injected to avoid duplicates
  if (content.includes('Nive - A premium reading experience.')) {
    console.log(`Skipping ${file} - already has SEO tags`);
    continue;
  }

  // Find a good place to inject. Usually after <meta name="viewport" ...> or <meta charset="...">
  // If neither, then after <head>
  
  if (content.includes('<meta name="viewport"')) {
    content = content.replace(/(<meta name="viewport"[^>]*>)/i, `$1\n${tagsToInject}`);
  } else if (content.includes('<title>')) {
    content = content.replace(/(<title>)/i, `${tagsToInject}\n$1`);
  } else if (content.includes('<head>')) {
    content = content.replace(/(<head>)/i, `$1\n${tagsToInject}`);
  } else {
    console.log(`Could not find a place to inject in ${file}`);
    continue;
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
