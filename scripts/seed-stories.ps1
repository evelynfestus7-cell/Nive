$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$coversDir = Join-Path $root "assets\covers"
$bannersDir = Join-Path $root "assets\banners"
$dataDir = Join-Path $root "data"

New-Item -ItemType Directory -Force $coversDir | Out-Null
New-Item -ItemType Directory -Force $bannersDir | Out-Null
New-Item -ItemType Directory -Force $dataDir | Out-Null

$catalog = @(
  @{ id="ember-court"; title="The Ember Court"; genre="Fantasy"; author="Alaere Stone"; rating=4.9; featured=$true; premium=$false; palette=@("#25030a","#d71920","#ffb35c"); motif="crown"; premise="a palace of fire-lit politics where a reluctant heir must decide whether mercy or power will save the realm"; hero="Nara"; companion="Prince Vale"; rival="Lady Cinder" },
  @{ id="neon-oracle"; title="Neon Oracle"; genre="Sci-Fi"; author="Mika Raye"; rating=4.8; featured=$true; premium=$false; palette=@("#06111f","#15f4ee","#ff2bd6"); motif="eye"; premise="a rain-soaked megacity where a courier starts receiving predictions from a machine that should not know her name"; hero="Iris"; companion="Juno"; rival="The Oracle" },
  @{ id="moonlit-letters"; title="Moonlit Letters"; genre="Romance"; author="Susan C"; rating=4.7; featured=$true; premium=$false; palette=@("#120914","#b96cff","#ffd1dc"); motif="moon"; premise="two strangers exchanging letters across time through a locked drawer in an old hotel"; hero="Elena"; companion="Tomas"; rival="The Missing Year" },
  @{ id="blackwater-signal"; title="Blackwater Signal"; genre="Thriller"; author="K. Aden"; rating=4.8; featured=$true; premium=$true; palette=@("#020608","#126872","#e8f7ff"); motif="wave"; premise="a coastal town where every radio turns on at midnight with the voice of someone presumed dead"; hero="Maya"; companion="Detective Oris"; rival="The Signal" },
  @{ id="garden-of-glass"; title="Garden of Glass"; genre="Mystery"; author="Lina Vale"; rating=4.6; featured=$true; premium=$false; palette=@("#071b16","#37d399","#e7fff5"); motif="leaf"; premise="an abandoned botanical dome where each mirrored flower reflects a different version of the truth"; hero="Sage"; companion="Dr. Ivo"; rival="The Curator" },
  @{ id="ashes-of-aurelion"; title="Ashes of Aurelion"; genre="Fantasy"; author="Tomi Grey"; rating=4.5; featured=$false; premium=$false; palette=@("#1b0b04","#f97316","#fde68a"); motif="dragon"; premise="a fallen dragon city whose last map burns brighter whenever a lie is spoken"; hero="Keza"; companion="Rook"; rival="General Vask" },
  @{ id="velvet-alibi"; title="The Velvet Alibi"; genre="Mystery"; author="Nora Blake"; rating=4.4; featured=$false; premium=$false; palette=@("#170410","#8b1e52","#f9a8d4"); motif="mask"; premise="a jazz club murder where every witness tells the truth, but never in the right order"; hero="Dara"; companion="Miles"; rival="Madam Vesper" },
  @{ id="starfall-academy"; title="Starfall Academy"; genre="Young Adult"; author="J. N. Morrow"; rating=4.3; featured=$false; premium=$false; palette=@("#0b1026","#6366f1","#facc15"); motif="star"; premise="a school for sky-mages where one student discovers the constellations are moving against them"; hero="Tali"; companion="Bex"; rival="Headmaster Sol" },
  @{ id="last-train-elysium"; title="Last Train to Elysium"; genre="Sci-Fi"; author="Ada Cross"; rating=4.6; featured=$false; premium=$true; palette=@("#030712","#38bdf8","#f8fafc"); motif="train"; premise="a luxury train crossing the rings of Saturn with one passenger who was never born"; hero="Noa"; companion="Captain Senn"; rival="Passenger Zero" },
  @{ id="salt-and-roses"; title="Salt and Roses"; genre="Romance"; author="Amara Quinn"; rating=4.2; featured=$false; premium=$false; palette=@("#1f1110","#fb7185","#fed7aa"); motif="rose"; premise="a chef and a florist rebuilding a seaside market after a storm slowly rebuild each other too"; hero="Mina"; companion="Leo"; rival="Old Grief" },
  @{ id="clockwork-saints"; title="Clockwork Saints"; genre="Steampunk"; author="Eben Hart"; rating=4.5; featured=$false; premium=$false; palette=@("#17120a","#b45309","#fde68a"); motif="gear"; premise="a city of brass saints where a mechanic finds a prayer engine counting down to disaster"; hero="Pax"; companion="Sister Anni"; rival="The Brass Bishop" },
  @{ id="hollow-lane"; title="Hollow Lane"; genre="Horror"; author="Ife Vale"; rating=4.1; featured=$false; premium=$false; palette=@("#050505","#7f1d1d","#d1d5db"); motif="door"; premise="a quiet street where the houses rearrange themselves whenever someone tells a secret"; hero="Nell"; companion="Owen"; rival="House Seven" },
  @{ id="river-of-names"; title="River of Names"; genre="Historical"; author="M. Etuk"; rating=4.4; featured=$false; premium=$false; palette=@("#102018","#0f766e","#fef3c7"); motif="river"; premise="an archivist following a river ledger that records names before their owners arrive"; hero="Eka"; companion="Samuel"; rival="The Registrar" },
  @{ id="sable-witch"; title="The Sable Witch"; genre="Fantasy"; author="Rina Moss"; rating=4.7; featured=$false; premium=$true; palette=@("#0c0612","#7c3aed","#c4b5fd"); motif="raven"; premise="a witch without a shadow hired to steal one from a king who has too many"; hero="Sable"; companion="Finch"; rival="King Orven" },
  @{ id="diamond-protocol"; title="Diamond Protocol"; genre="Thriller"; author="Cole Vance"; rating=4.3; featured=$false; premium=$false; palette=@("#07111f","#0ea5e9","#e0f2fe"); motif="diamond"; premise="a cybersecurity analyst discovering that a stolen diamond is actually a key to a sleeping satellite"; hero="Zed"; companion="Alma"; rival="Glass" },
  @{ id="paper-sun"; title="Paper Sun"; genre="Drama"; author="N. Aster"; rating=4.0; featured=$false; premium=$false; palette=@("#20140d","#f59e0b","#fff7ed"); motif="sun"; premise="a family-owned print shop fighting closure after an old poster predicts tomorrow's headline"; hero="Ima"; companion="Bayo"; rival="The Deadline" },
  @{ id="widow-of-mars"; title="Widow of Mars"; genre="Sci-Fi"; author="Esi North"; rating=4.5; featured=$false; premium=$false; palette=@("#1c0705","#ef4444","#fed7aa"); motif="planet"; premise="a terraformer on Mars receives messages from a spouse who died before the colony launched"; hero="Rhea"; companion="Unit Cal"; rival="The Red Silence" },
  @{ id="blue-hour-cafe"; title="The Blue Hour Cafe"; genre="Romance"; author="Harper Sol"; rating=4.1; featured=$false; premium=$false; palette=@("#071827","#2563eb","#bfdbfe"); motif="cup"; premise="a cafe that opens for exactly one hour each night to people who regret the same choice"; hero="Nico"; companion="Ari"; rival="The Last Order" },
  @{ id="bone-compass"; title="The Bone Compass"; genre="Adventure"; author="T. Wren"; rating=4.4; featured=$false; premium=$false; palette=@("#18120a","#ca8a04","#fef9c3"); motif="compass"; premise="an explorer following a compass carved from bone that points toward what the heart avoids"; hero="Tess"; companion="Makoa"; rival="The Northless Crew" },
  @{ id="static-hearts"; title="Static Hearts"; genre="Sci-Fi Romance"; author="June Iro"; rating=4.2; featured=$false; premium=$false; palette=@("#140719","#ec4899","#a7f3d0"); motif="heart"; premise="two astronauts separated by a time-delay learn the static between transmissions is answering back"; hero="Nova"; companion="Ren"; rival="The Delay" },
  @{ id="citadel-under-rain"; title="Citadel Under Rain"; genre="Fantasy"; author="P. Ekanem"; rating=4.6; featured=$false; premium=$true; palette=@("#06131a","#0891b2","#ccfbf1"); motif="tower"; premise="a floating citadel where rain falls upward and every drop contains a stolen memory"; hero="Ori"; companion="Kite"; rival="The Rainwardens" },
  @{ id="red-thread-market"; title="Red Thread Market"; genre="Mystery"; author="Zara Moon"; rating=4.3; featured=$false; premium=$false; palette=@("#1a0505","#dc2626","#fecaca"); motif="thread"; premise="a night market where a red thread ties every buyer to the person they will betray"; hero="Ayo"; companion="Mei"; rival="The Thread Seller" },
  @{ id="winter-in-veloria"; title="Winter in Veloria"; genre="Fantasy"; author="Celia Frost"; rating=4.0; featured=$false; premium=$false; palette=@("#08111f","#60a5fa","#eff6ff"); motif="snow"; premise="a winter kingdom where warmth is illegal and one baker hides a living flame in her oven"; hero="Liora"; companion="Bram"; rival="The Frost Court" },
  @{ id="oracle-of-owls"; title="Oracle of Owls"; genre="Mystery"; author="Dee Rowan"; rating=4.2; featured=$false; premium=$false; palette=@("#111827","#6b7280","#fef3c7"); motif="owl"; premise="a librarian translating owl calls that reveal which patron will vanish before dawn"; hero="Tara"; companion="Moss"; rival="The Night Index" },
  @{ id="golden-hour-heist"; title="Golden Hour Heist"; genre="Adventure"; author="Remy Fox"; rating=4.5; featured=$false; premium=$false; palette=@("#1f1605","#f59e0b","#fde68a"); motif="key"; premise="a crew planning a museum heist that can only happen in the seven minutes before sunset"; hero="Vera"; companion="Kit"; rival="The Collector" }
)

function Convert-HexToColor($hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Draw-Asset($story, $path, $width, $height, $isBanner) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (Convert-HexToColor $story.palette[0]), (Convert-HexToColor $story.palette[1]), 35
  $graphics.FillRectangle($brush, $rect)

  $accent = Convert-HexToColor $story.palette[2]
  $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, $accent.R, $accent.G, $accent.B))
  $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, $accent.R, $accent.G, $accent.B)), ([Math]::Max(2, [int]($width / 150)))

  for ($i = 0; $i -lt 8; $i++) {
    $x = [int](($i * $width / 7) - ($width * .12))
    $size = [int]($height * (.18 + (($i % 3) * .05)))
    $graphics.FillEllipse($accentBrush, $x, [int]($height * .12 + (($i % 2) * $height * .22)), $size, $size)
  }

  for ($i = 0; $i -lt 6; $i++) {
    $y = [int](($height * .18) + ($i * $height * .12))
    $graphics.DrawBezier($linePen, 0, $y, [int]($width * .28), $y - 80, [int]($width * .72), $y + 80, $width, $y)
  }

  if ($isBanner) {
    $centerXFactor = .76
    $centerYFactor = .48
    $symbolFactor = .38
    $fontTitleSize = 48
    $fontMetaSize = 16
  } else {
    $centerXFactor = .5
    $centerYFactor = .42
    $symbolFactor = .28
    $fontTitleSize = 30
    $fontMetaSize = 12
  }

  $centerX = [int]($width * $centerXFactor)
  $centerY = [int]($height * $centerYFactor)
  $symbolSize = [int]($height * $symbolFactor)
  $symbolRect = New-Object System.Drawing.Rectangle ($centerX - [int]($symbolSize / 2)), ($centerY - [int]($symbolSize / 2)), $symbolSize, $symbolSize
  $graphics.DrawEllipse($linePen, $symbolRect)
  $graphics.DrawLine($linePen, $centerX, $symbolRect.Top, $centerX, $symbolRect.Bottom)
  $graphics.DrawLine($linePen, $symbolRect.Left, $centerY, $symbolRect.Right, $centerY)

  $titleFont = New-Object System.Drawing.Font "Georgia", $fontTitleSize, ([System.Drawing.FontStyle]::Bold)
  $metaFont = New-Object System.Drawing.Font "Segoe UI", $fontMetaSize, ([System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 255, 255, 255))

  if ($isBanner) {
    $graphics.DrawString($story.genre.ToUpperInvariant(), $metaFont, $mutedBrush, 44, 42)
    $graphics.DrawString($story.title, $titleFont, $textBrush, 42, [int]($height * .38))
    $graphics.DrawString(("Rating " + $story.rating + " / " + $story.author), $metaFont, $mutedBrush, 46, [int]($height * .68))
  } else {
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $titleRect = New-Object System.Drawing.RectangleF -ArgumentList 24, ([single]($height * .62)), ([single]($width - 48)), 110
    $genreRect = New-Object System.Drawing.RectangleF -ArgumentList 24, ([single]($height * .84)), ([single]($width - 48)), 32
    $graphics.DrawString($story.title, $titleFont, $textBrush, $titleRect, $format)
    $graphics.DrawString($story.genre.ToUpperInvariant(), $metaFont, $mutedBrush, $genreRect, $format)
  }

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$stories = @()
$chapters = @{}
$index = 0

foreach ($item in $catalog) {
  $index += 1
  $cover = "assets/covers/$($item.id).jpg"
  $banner = "assets/banners/$($item.id)-banner.jpg"
  Draw-Asset $item (Join-Path $root $cover) 768 1152 $false
  Draw-Asset $item (Join-Path $root $banner) 1536 768 $true

  $created = (Get-Date "2026-07-07").AddMinutes($index)
  $stories += [ordered]@{
    id = $item.id
    title = $item.title
    description = "An interactive $($item.genre.ToLower()) story about $($item.premise)."
    author = $item.author
    genre = $item.genre
    cover = $cover
    banner = $banner
    rating = $item.rating
    premium = $item.premium
    featured = $item.featured
    createdAt = [int64]([DateTimeOffset]$created).ToUnixTimeMilliseconds()
    characters = @(
      @{ name=$item.hero; role="Lead reader-perspective character"; avatar="assets/avatars/avatar1.png" },
      @{ name=$item.companion; role="Ally with a secret"; avatar="assets/avatars/avatar2.png" },
      @{ name=$item.rival; role="Opposing force"; avatar="assets/avatars/avatar3.png" }
    )
    achievements = @(
      "Find the hidden clue in $($item.title)",
      "Complete every branch",
      "Finish the final chapter"
    )
  }

  $chapters[$item.id] = @(
    [ordered]@{
      id = "start"
      title = "Chapter 1: The First Sign"
      mood = "black"
      content = "<p>$($item.hero) arrives at the edge of a mystery: $($item.premise). The first sign is small enough to ignore and strange enough to change everything.</p><p>$($item.companion) offers help, but $($item.rival) has already moved pieces into place.</p>"
      choices = @(
        @{ text="Follow the clue before anyone notices"; next="risk" },
        @{ text="Question $($item.companion) first"; next="trust" }
      )
    },
    [ordered]@{
      id = "risk"
      title = "Chapter 2: The Dangerous Path"
      mood = "crimson"
      content = "<p>The bold path leads $($item.hero) into a hidden chamber of warnings, half-truths, and one object that should not exist.</p><p>Taking it could reveal the truth, but it will also alert $($item.rival).</p>"
      choices = @(
        @{ text="Take the object and run"; next="reveal" },
        @{ text="Leave it and follow the footsteps"; next="reveal" }
      )
    },
    [ordered]@{
      id = "trust"
      title = "Chapter 2: The Quiet Question"
      mood = "blue"
      content = "<p>$($item.companion) does not answer directly. Instead, they tell $($item.hero) a story with one detail that sounds impossible.</p><p>The detail points to a meeting place where $($item.rival) waits behind a gentle smile.</p>"
      choices = @(
        @{ text="Believe the impossible detail"; next="reveal" },
        @{ text="Set a trap at the meeting place"; next="reveal" }
      )
    },
    [ordered]@{
      id = "reveal"
      title = "Chapter 3: What the World Hid"
      mood = "purple"
      content = "<p>The secret opens like a wound. $($item.hero) learns that the threat is not only $($item.rival), but the fear that made everyone obey.</p><p>A final choice remains: protect the truth quietly or let it burn bright enough for everyone to see.</p>"
      choices = @(
        @{ text="Protect the truth quietly"; next="ending" },
        @{ text="Reveal everything now"; next="ending" }
      )
    },
    [ordered]@{
      id = "ending"
      title = "Chapter 4: The Choice That Remains"
      mood = "sepia"
      content = "<p>By dawn, $($item.hero) understands the cost of the path taken. $($item.companion) stands nearby, changed by loyalty, while $($item.rival) leaves one last warning.</p><p>The story ends, but the world is no longer willing to stay quiet.</p>"
      choices = @()
    }
  )
}

$jsonOptions = @{ Depth = 20 }
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $dataDir "stories.json"), ($stories | ConvertTo-Json @jsonOptions), $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $dataDir "chapters.json"), ($chapters | ConvertTo-Json @jsonOptions), $utf8NoBom)

Write-Output "Seeded $($stories.Count) stories, $($chapters.Keys.Count) chapter sets, and generated cover/banner images."
