import sys, json, re, openpyxl, pdfplumber
xlsx, pdf, out = sys.argv[1:4]
wb = openpyxl.load_workbook(xlsx)
ws = wb["Publicacion Externa"]
rows = []
for r in ws.iter_rows(min_row=12, values_only=True):
    if not r[5]: continue
    d, m, y = r[6].split("-")
    rows.append(dict(region=r[0], province=r[1], municipality=r[2], scope=r[3], equipment=str(r[4]),
        circuit=r[5].strip(), date=f"{y}-{m}-{d}", start=str(r[7])[:5], end=str(r[9])[:5], zones=r[10].strip(), cause=r[11], clients=r[12]))
# Edeeste control PDF: use word positions; code column x range
recs = []
with pdfplumber.open(pdf) as p:
    for page in p.pages:
        words = page.extract_words(keep_blank_chars=False)
        codes = [w for w in words if re.fullmatch(r"[A-Z]{2,4}\d{2,4}|RCL\d{3}|[A-Z]{4}\d{2}", w["text"]) and 150 < w["x0"] < 260]
        codes.sort(key=lambda w: w["top"])
        for i, c in enumerate(codes):
            top = c["top"]
            prev = codes[i-1]["top"] if i else 0
            nxt = codes[i+1]["top"] if i+1 < len(codes) else 1e9
            lo, hi = (prev+top)/2 if i else top-40, (top+nxt)/2
            name = " ".join(w["text"] for w in words if w["x1"] < c["x0"] - 5 and abs(w["top"]-top) < 3)
            zones = " ".join(w["text"] for w in sorted(words, key=lambda w:(round(w["top"]),w["x0"])) if w["x0"] > c["x1"] + 5 and lo <= w["top"] < hi)
            recs.append(dict(code=c["text"], name=name, zones=zones))
json.dump(dict(edenorte=rows, edeeste_control=recs), open(out, "w"), ensure_ascii=False, indent=1)
print(len(rows), len(recs)); print(recs[:4]); print(recs[-2:])
