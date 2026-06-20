---
name: gemini-image-understanding
description: >-
  Reference for understanding IMAGES with the Google Gemini API. Use when building image
  analysis: passing images to Gemini (File API upload, inline base64, supported formats,
  multiple images per request), and prompting for description, object detection with bounding
  boxes, segmentation masks, OCR / text extraction, and visual Q&A — plus token / media_resolution
  cost notes and best practices. Image counterpart of the Gemini video-understanding guide.
---

# Gemini image understanding

Gemini models process images natively: describe scenes, answer questions, detect & localize objects
(bounding boxes), segment them (masks), and extract text (OCR). Default model: **`gemini-3.5-flash`**
(use the latest Gemini for best vision quality).

## Choosing an input method

| Method | Max size | Use case |
|---|---|---|
| **File API** | 20GB (paid) / 2GB (free) | Reusable images, batches, total request > 20MB |
| **Inline data (base64)** | < 20MB total request | One-off, small images |
| **Cloud Storage URI** | per-file | Persistent, shared images |

Rule of thumb: use the **File API** when the total request (images + prompt) exceeds ~20MB or when
you reuse the same image across requests; otherwise inline base64 is simplest.

## Supported formats (MIME)
`image/png` · `image/jpeg` · `image/webp` · `image/heic` · `image/heif`

## Upload an image (File API)

### Python
```python
from google import genai

client = genai.Client()
myfile = client.files.upload(file="path/to/image.png")

response = client.models.generate_content(
    model="gemini-3.5-flash",
    contents=[myfile, "Describe this image in detail. What is the mood and setting?"],
)
print(response.text)
```

### JavaScript
```javascript
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const ai = new GoogleGenAI({});
const myfile = await ai.files.upload({ file: "path/to/image.png", config: { mimeType: "image/png" } });

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: createUserContent([
    createPartFromUri(myfile.uri, myfile.mimeType),
    "Describe this image in detail. What is the mood and setting?",
  ]),
});
console.log(response.text);
```

### REST
```bash
IMG=path/to/image.png; MIME=$(file -b --mime-type "$IMG")
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" -H 'Content-Type: application/json' -X POST -d '{
    "contents":[{"parts":[
      {"inline_data":{"mime_type":"'"$MIME"'","data":"'"$(base64 -w0 "$IMG")"'"}},
      {"text":"Describe this image in detail."}]}]}'
```

## Pass image data inline (small images, < 20MB)

### Python
```python
from google import genai
from google.genai import types

img = open("image.png", "rb").read()
client = genai.Client()
resp = client.models.generate_content(
    model="gemini-3.5-flash",
    contents=types.Content(parts=[
        types.Part(inline_data=types.Blob(data=img, mime_type="image/png")),
        types.Part(text="What objects are in this image?"),
    ]),
)
print(resp.text)
```

### JavaScript
```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});
const b64 = fs.readFileSync("image.png", { encoding: "base64" });
const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: [{ inlineData: { mimeType: "image/png", data: b64 } }, { text: "What objects are in this image?" }],
});
console.log(response.text);
```

## Multiple images per request
Pass several image parts before the text prompt; ask the model to compare/relate them.
```python
contents = [img1_part, img2_part, types.Part(text="What changed between the first and second image?")]
```
Gemini 2.5+ accepts many images per request. Put the **text prompt after** the image parts.

## Object detection (bounding boxes)
Ask for boxes and request JSON. Gemini returns coordinates **normalized to 0–1000** as
`box_2d = [ymin, xmin, ymax, xmax]`. Convert to pixels: multiply by width/height and divide by 1000.

```python
prompt = (
  "Detect all prominent objects. Return a JSON array; each item: "
  '{"label": string, "box_2d": [ymin, xmin, ymax, xmax]} with coords normalized 0-1000.'
)
resp = client.models.generate_content(
    model="gemini-3.5-flash",
    contents=[myfile, prompt],
    config=types.GenerateContentConfig(response_mime_type="application/json"),
)
boxes = json.loads(resp.text)
# pixel box: x = xmin/1000*W, y = ymin/1000*H, ...
```

## Segmentation masks (Gemini 2.5+)
Returns, per object: a `box_2d`, a `label`, and a `mask` (base64-encoded PNG probability map,
to be scaled into its box). Prompt example:
```
Give the segmentation masks for the main objects. Output a JSON list where each entry has
"box_2d", "label", and "mask" (base64 PNG).
```

## OCR / text extraction
```python
resp = client.models.generate_content(
    model="gemini-3.5-flash",
    contents=[myfile, "Extract ALL text exactly as written, preserving line breaks and reading order."],
)
```
For structured docs, ask for JSON (e.g. `{"total": ..., "date": ..., "line_items": [...]}`).

## Visual Q&A
```python
contents=[myfile, "Is the person wearing glasses? Answer yes/no and explain what you see."]
```

## Cost / tokens & media_resolution
- Small images (≤ 384×384) ≈ **258 tokens**. Larger images are split into 768×768 tiles, **258 tokens
  per tile** (so a big image can be several hundred to ~1k+ tokens).
- **`media_resolution`** (Gemini 3) caps tokens per image: `low` (≈66/tile) · `medium` · `high`.
  Higher = better fine text/small-detail reading, more tokens & latency. Lower = cheaper/faster.
```python
config=types.GenerateContentConfig(media_resolution="MEDIA_RESOLUTION_LOW")
```

## Best practices
- Put the **text prompt after** the image part(s) in `contents`.
- Use the **File API** when reusing an image or total request > 20MB; inline for one-offs.
- For detection/segmentation/OCR, set `response_mime_type="application/json"` and specify the exact
  schema you want — Gemini follows it well.
- Remember **box_2d is 0–1000 normalized** (not pixels); scale by the image's real width/height.
- Raise `media_resolution` only when you need to read fine text / tiny details.
- Upright the image first (honor EXIF rotation) for reliable spatial answers.
- Human-review outputs for accuracy/bias-sensitive use cases.

## See also
- Files API: https://ai.google.dev/gemini-api/docs/files
- Image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- Media resolution: https://ai.google.dev/gemini-api/docs/media-resolution
