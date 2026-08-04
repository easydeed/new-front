# TitlePoint Title Searching Reference Package

This package was generated from the captured QA2 TitlePoint documentation.

## Files

- `titlepoint-title-searching-reference.md`
  Human-readable cleaned reference containing all captured pages.

- `titlepoint-title-searching-chunks.jsonl`
  Retrieval-ready semantic chunks. Each row includes source URL, filename, heading path, methods, service types, parameters, and cleaned content.

- `titlepoint-title-searching-inventory.json`
  Exact lookup inventory for methods, service types, parameters, and pages.

## Recommended question-answering behavior

1. Search the JSONL using both exact keywords and semantic similarity.
2. Prefer exact matches for method names, service types, parameters, and county names.
3. Return the source filename and URL with every answer.
4. Do not combine conflicting parameter definitions silently.
5. Say when the documentation does not answer the question.
6. Treat deprecated methods as deprecated even when examples elsewhere still mention them.

## Corpus statistics

- Pages: 53
- Chunks: 116
- Methods indexed: 19
- Service types indexed: 32
- Parameters indexed: 162
