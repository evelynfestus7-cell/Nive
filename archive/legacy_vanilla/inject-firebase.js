const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/HP/Documents/Nive';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const tagsToInject = `
<script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js"></script>
<script src="js/firebase-config.js"></script>
`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already injected to avoid duplicates
  if (content.includes('firebase-app-compat.js')) {
    console.log(`Skipping ${file} - already has Firebase tags`);
    continue;
  }

  // Find the first script tag to inject before it, or before </body>
  if (content.includes('<script src="js/user.js">')) {
    content = content.replace('<script src="js/user.js">', `${tagsToInject}<script src="js/user.js">`);
  } else if (content.includes('<script src="js/database.js">')) {
    content = content.replace('<script src="js/database.js">', `${tagsToInject}<script src="js/database.js">`);
  } else if (content.includes('</body>')) {
    content = content.replace('</body>', `${tagsToInject}</body>`);
  } else {
    console.log(`Could not find a place to inject in ${file}`);
    continue;
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file} with Firebase`);
}
