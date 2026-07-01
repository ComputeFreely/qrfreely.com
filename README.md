# QR Freely

QR Freely is a free, browser-only QR code generator.

Live site: https://qrfreely.com/

Source code: https://github.com/ComputeFreely/qrfreely.com

Issues and feedback: https://github.com/ComputeFreely/qrfreely.com/issues/new

## Features

- Create QR codes for URLs, Wi-Fi networks, contacts, email, phone numbers, SMS, calendar events, locations, and plain text.
- Customize colors, gradients, dot styles, finder markers, quiet zone, logo, border, and frame label.
- Export PNG or SVG.
- Runs in the browser with no redirects, no account, no upload step, and no runtime CDN dependency.

## Run Locally

This is a static site. From this directory:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## QR Formats

The generator uses scanner-compatible payload formats:

- Wi-Fi: `WIFI:T:<auth>;S:<ssid>;P:<password>;H:<hidden>;;`
- Contact: vCard 4.0 text
- Email: `mailto:` URI
- Phone: `tel:` URI
- SMS: `sms:` URI
- Event: iCalendar `VCALENDAR` text
- Location: `geo:` URI

## License

CC0-1.0. See `LICENSE`.
