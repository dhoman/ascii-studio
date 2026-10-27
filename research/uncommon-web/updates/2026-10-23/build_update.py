"""Build an additions-only report without changing the original catalog."""
import csv, datetime, html, io, json, subprocess
from pathlib import Path
from urllib.parse import urlsplit
BASE=Path(__file__).parent
ORIGINAL=BASE.parent.parent
SCRIPT='/opt/data/profiles/ascii-studio/skills/research/grounded-citations/scripts/sources.py'
LEDGER=str(BASE/'sources.json')

def root_repo(url):
    p=urlsplit(url)
    return 'https://github.com/'+'/'.join(p.path.strip('/').split('/')[:2]) if p.netloc=='github.com' else url

def main():
    diff=json.loads((BASE/'diff.json').read_text());repos=json.loads((BASE/'repositories.json').read_text());by={r['url']:r for r in repos}
    demos=json.loads((BASE/'demos.json').read_text());old_demos=json.loads((ORIGINAL/'demos.json').read_text());old_ids={r['id'] for r in old_demos};new_ids={r['id'] for r in demos}
    assert len(diff['added'])==32 and len(diff['removed'])==0
    assert old_ids <= new_ids and len(new_ids-old_ids)==32
    assert len(demos)==462 and diff['new_libraries']==425
    assert len({d['category_id'] for d in demos})==23
    rows=[]
    for item in diff['added']:
        source=next((l['url'] for l in item['links'] if l['label'].startswith('source')),'')
        root=root_repo(source) if source else ''
        repo=by.get(root,{})
        footer=next(d['footer'] for d in demos if d['name']==item['name'])
        label=footer.split(' · ')[0] if ' · ' in footer else ''
        lic=repo.get('license')
        basis='GitHub root-repository detection'
        if not lic or lic=='NOASSERTION':lic=label or 'Not verified';basis='Directory label only; verify exact package license'
        row=dict(name=item['name'],category=item['categories'][0],repo=root,docs_or_site=next((l['url'] for l in item['links'] if l['label'].startswith('site')),''),stars=repo.get('stars'),license=lic,license_basis=basis,capabilities=' '.join(item['capabilities']),demo=item['demos'][0],notes='')
        if item['name']=='Houdini Doom Fire':
            row['notes']='No authoritative repository link found in the directory, official demo HTML, or npm latest metadata; source repo/stars left unverified. npm metadata declares Apache-2.0.'
            row['license']='Apache-2.0';row['license_basis']='npm latest package metadata'
        if item['name']=='Houdini Tesla & Noise':row['notes']='Combined demo; repository/stars refer to houdini-tesla, not a separate combined framework.'
        if item['name']=='d3-geo-projection':row['notes']='Demo also uses d3-geo-polygon; listed repo/stars are for d3-geo-projection.'
        rows.append(row)
    meta=dict(checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),baseline='2026-10-22',old_libraries=393,libraries=425,old_demos=430,demos=462,families=23,added_libraries=len(rows),removed_libraries=0,extra_demos_for_existing=0,removed_demo_ids=sorted(old_ids-new_ids))
    (BASE/'additions.json').write_text(json.dumps(dict(meta=meta,libraries=rows),indent=2,ensure_ascii=False))
    csvfile=io.StringIO();writer=csv.DictWriter(csvfile,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows);(BASE/'additions.csv').write_text(csvfile.getvalue())
    urls=['https://webdev.teknium.io/']+[r['repo'] for r in rows if r['repo']]+['https://registry.npmjs.org/houdini-doom-fire/latest']
    subprocess.run(['python',SCRIPT,'--ledger',LEDGER,'add',*urls],capture_output=True,text=True,check=True)
    ledger=json.loads(subprocess.check_output(['python',SCRIPT,'--ledger',LEDGER,'list','--json'],text=True));ids={x['url'].rstrip('/'):x['id'] for x in ledger}
    def cite(u):
        source_id=ids[u.rstrip('/')]
        return f'[{source_id}]'
    def cell(v):return str('Unavailable' if v is None else v).replace('|','\\|').replace('\n',' ')
    md=['# New additions to Uncommon Web','',f'Checked {meta["checked_at"]}. Compared against our saved 2026-10-22 snapshot.','',f'32 new library names and 32 new demo cards. Libraries: 393 → 425; demos: 430 → 462; families: 22 → 23. No removed library names or demo IDs; no additional demo cards for pre-existing library names.{cite(urls[0])}','',f'New family: CSS-only & stylesheets. This is the site’s category label, not a claim that every item is exclusively CSS (Arwes and React Pixel UI use React/JavaScript).{cite(urls[0])}','','The original 393-library catalog has not been overwritten. Capabilities below are the directory descriptions. Stars are exact observed repository totals, not quality ratings or benchmarks. Documentation/site links are those supplied by the directory; they are not all dedicated API documentation. Licenses marked directory-only require confirmation.','']
    for category in dict.fromkeys(r['category'] for r in rows):
        md.extend(['## '+category,'','| Addition | Repository | Docs / site | Stars | License | Capabilities | Notes / evidence |','|---|---|---|---:|---|---|---|'])
        for r in rows:
            if r['category']!=category:continue
            citations=cite(urls[0])+cite(r['repo'] if r['repo'] else urls[-1])
            md.append('| '+' | '.join(cell(v) for v in [r['name'],r['repo'] or 'Not verified',r['docs_or_site'],r['stars'],r['license']+' ('+r['license_basis']+')',r['capabilities'],r['notes']+' '+citations])+' |')
    (BASE/'additions.md').write_text('\n'.join(md)+'\n')
    subprocess.run(['python',SCRIPT,'--ledger',LEDGER,'render','--replace-in',str(BASE/'additions.md')],capture_output=True,text=True,check=True)
    esc=html.escape
    def anchor(u,t):return '<a href="'+esc(u,quote=True)+'">'+esc(t)+'</a>' if u else 'Not verified'
    table=[]
    for r in rows:
        table.append('<tr><td><b>'+esc(r['name'])+'</b><small>'+esc(r['category'])+'</small></td><td>'+anchor(r['repo'],'Repository')+'<br>'+anchor(r['docs_or_site'],'Docs / site')+'<br>'+anchor(r['demo'],'Teknium demo')+'</td><td>'+('—' if r['stars'] is None else f'{r["stars"]:,}')+'</td><td>'+esc(r['license'])+'<small>'+esc(r['license_basis'])+'</small></td><td>'+esc(r['capabilities'][:250])+('…' if len(r['capabilities'])>250 else '')+'<details><summary>Full description / notes</summary><p>'+esc(r['capabilities'])+'</p><p>'+esc(r['notes'])+'</p></details></td></tr>')
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uncommon Web — 32 new additions</title><style>body{background:#101314;color:#e4ebe6;font:15px/1.5 system-ui;margin:32px auto;padding:0 24px;max-width:1450px}a,summary{color:#b5ef92}p{max-width:1000px;color:#aab9b1}h1{font-size:36px}table{width:100%;border-collapse:collapse;min-width:1000px}th,td{text-align:left;padding:16px;border-bottom:1px solid #303a35;vertical-align:top}th{background:#192020}td:first-child{width:16%}td:nth-child(2){width:12%}td:last-child{width:45%}small{display:block;color:#aab9b1;font-size:12px;margin:8px 0}details{margin-top:10px}summary{cursor:pointer}.wrap{overflow:auto}strong{color:#b5ef92}</style><h1>Uncommon Web: <strong>32 new additions</strong></h1><p>Compared with the saved October 22 snapshot. Checked October 23, 2026 UTC.<br>393 → 425 libraries · 430 → 462 demos · 22 → 23 families.<br>No removed library names or demo IDs. No extra demos for existing library names.</p><p>The new family is “CSS-only & stylesheets”—the site's label; it also includes React/JS tools. Repository stars are a popularity snapshot, not a quality rating. Capabilities are the directory's descriptions; directory-only license labels need confirmation.</p><p><a href="additions.csv">CSV</a> · <a href="additions.md">Complete sourced report</a> · <a href="additions.json">JSON</a> · <a href="../../index.html">Original 393-library catalog (unchanged)</a></p><div class="wrap"><table><thead><tr><th>New library</th><th>Links</th><th>Stars</th><th>License</th><th>Capabilities</th></tr></thead><tbody>'''+''.join(table)+'''</tbody></table></div></html>'''
    (BASE/'index.html').write_text(page)
    print(json.dumps(meta,indent=2));print('Groups:',{c:sum(r['category']==c for r in rows) for c in dict.fromkeys(r['category'] for r in rows)})
if __name__=='__main__':main()
