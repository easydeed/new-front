# Widget Integration Guide for Clients

## API Embed (For Developers)
Use your key to fetch HTML:
```js
fetch('https://deedpro-main-api.onrender.com/embed/wizard', {
  method: 'POST',
  headers: { 'X-API-Key': 'your_key', 'Content-Type': 'application/json' },
  body: JSON.stringify({ deed_type: 'grant_deed', data: { grantor: 'John Doe' /* fields */ } })
}).then(res => res.json()).then(data => {
  document.getElementById('widget-div').innerHTML = data.html;
});
```

## HTML Snippet (For Non-Developers)
Paste this:
```html
<script>
  async function loadWidget() {
    const data = { deed_type: "grant_deed", data: { grantor: "John Doe" /* Your data */ } };
    const res = await fetch("https://deedpro-main-api.onrender.com/embed/wizard", {
      method: "POST",
      headers: { "X-API-Key": "your_key", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    document.getElementById("widget-iframe").contentDocument.body.innerHTML = result.html;
  }
  loadWidget();
</script>
<iframe id="widget-iframe" style="width: 100%; height: 600px; border: none;"></iframe>
```

## Usage Examples

- **Data for Grant Deed**: `{ "deed_type": "grant_deed", "data": { "grantor": "John Doe", "grantee": "Jane Smith" } }`
- **Billing**: $49/mo base + $0.50 per deed (tracked in embed_usage).

## Security & Usage

- Usage tracked in admin.
- Contact support for help. 