# Deed Generation Tests

This directory contains unit tests for the `/generate-deed` endpoint, ensuring pixel-perfect HTML injection and PDF output using Jinja2 templates and WeasyPrint.

## Setup

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```
This includes `pytest`, `jinja2`, and `weasyprint` needed for testing.

### Run Tests
```bash
cd backend/tests
pytest -v
```

Or from the backend directory:
```bash
pytest tests/ -v
```

## Test Files

- **`test_generate_deed.py`**: Unit tests for each deed type, checking data injection and pixel-perfect layout strings.
- **`sample_data.json`**: Mock data for comprehensive testing of all deed types.
- **`__init__.py`**: Python package initialization.

## Test Coverage

### Deed Types Tested
- **Grant Deed**: Standard property transfer deed
- **Quitclaim Deed**: Quick claim property transfer
- **Warranty Deed**: Property transfer with warranties
- **Deed of Trust**: Property as loan collateral

### What Each Test Validates
1. **HTTP Response**: 200 status code from `/generate-deed` endpoint
2. **Data Injection**: Jinja2 template correctly injects all provided data fields
3. **HTML Structure**: Generated HTML contains expected deed headers and sections
4. **CSS Styling**: Pixel-perfect layout with correct margins, fonts, and spacing
5. **PDF Generation**: WeasyPrint successfully creates base64-encoded PDF output

### Error Handling Tests
- Invalid deed types (should return 500 error)
- Missing data fields (should handle gracefully with empty fields)

## Adding New Tests

### For New Deed Types
1. Add template data to `sample_data.json`
2. Create test function in `test_generate_deed.py`:
   ```python
   def test_generate_new_deed_type(sample_new_deed_data):
       response = client.post("/generate-deed", json=sample_new_deed_data)
       assert response.status_code == 200
       # Add specific assertions for new deed type
   ```

### For New Test Cases
- Add edge cases (empty fields, special characters, long text)
- Test different formatting requirements
- Validate specific legal requirements

## CI Integration

Add to `.github/workflows/test.yml` for automated testing:

```yaml
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with: 
        python-version: '3.8'
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    - name: Run tests
      run: |
        cd backend
        pytest tests/ -v
```

## Integration with Main Application

These tests validate the `/generate-deed` endpoint that:
1. Accepts JSON data with `deed_type` and `data` fields
2. Uses Jinja2 to render HTML templates from `/backend/templates/`
3. Generates PDFs using WeasyPrint with precise formatting
4. Returns both HTML and base64-encoded PDF

## No Build Impact

- Tests are backend-only and run separately with `pytest`
- No impact on Vercel frontend deployment
- No impact on Render backend deployment (tests don't run in production)
- Dependencies are development-only and don't affect production performance

## Troubleshooting

### Common Issues
- **Missing templates**: Ensure `/backend/templates/` directory exists with deed HTML files
- **WeasyPrint dependencies**: May require system-level dependencies on some platforms
- **Import errors**: Run tests from correct directory (`backend/tests/` or `backend/`)

### Debugging
```bash
# Run specific test
pytest tests/test_generate_deed.py::test_generate_grant_deed -v

# Run with output
pytest tests/ -v -s

# Run with coverage
pip install pytest-cov
pytest tests/ --cov=main
``` 