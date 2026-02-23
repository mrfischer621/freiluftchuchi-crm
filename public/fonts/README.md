# PDF Fonts

Place the following Montserrat font files in this directory to enable Montserrat in generated PDFs.
Without these files the PDF generator silently falls back to Helvetica.

## Required files

| File | Weight |
|------|--------|
| `Montserrat-Regular.ttf` | 400 (normal) |
| `Montserrat-Bold.ttf` | 700 (bold) |

## Download

1. Go to https://fonts.google.com/specimen/Montserrat
2. Click **Download family**
3. Unzip → copy `static/Montserrat-Regular.ttf` and `static/Montserrat-Bold.ttf` here

Or use the direct static URLs from Google Fonts (run in terminal from this directory):

```bash
curl -L "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf" \
  -o Montserrat-Regular.ttf

curl -L "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w5aXo.ttf" \
  -o Montserrat-Bold.ttf
```

Note: The Google Fonts static URLs above are version-pinned. Check https://fonts.google.com for the latest version if they stop working.
