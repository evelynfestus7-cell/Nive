import glob

files = glob.glob('*.html')
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    changed = False
    old1 = '<link rel="icon" type="image/png" href="assets/logos/logo.png" />'
    old2 = '<link rel="icon" type="image/png" href="assets/logos/logo.png">'
    new_icons = '<link rel="icon" type="image/png" sizes="192x192" href="assets/logos/logo-dark-192.png" />\n  <link rel="icon" type="image/png" sizes="512x512" href="assets/logos/logo-dark-512.png" />\n  <link rel="apple-touch-icon" href="assets/logos/apple-touch-icon.png" />'
    
    if old1 in content:
        content = content.replace(old1, new_icons)
        changed = True
    if old2 in content:
        content = content.replace(old2, new_icons)
        changed = True
        
    if changed:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(content)
        print('Updated:', f)

print('Done updating HTML icon tags.')
