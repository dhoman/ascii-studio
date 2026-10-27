"""Independently refetch special-case primary sources and verify quoted evidence."""
import concurrent.futures,json,re
from html import unescape
from pathlib import Path
from collect import fetch
from extract import Parser,clean
BASE=Path(__file__).parent

def retrieve(url):
    body,status,final=fetch(url)
    parser=Parser();parser.feed(body)
    text=clean(parser.root.text()) if '<html' in body[:2000].lower() else clean(body)
    return dict(url=url,http_status=status,final_url=final,text=text)

def normalize(text):return re.sub(r'\s+',' ',unescape(text).replace('`','').replace('**','')).strip()

if __name__=='__main__':
    cases=json.loads((BASE/'special-cases.json').read_text());urls=sorted({u for c in cases for u in c['sources']}|{c['docs'] for c in cases})
    fallback='https://codeberg.org/thi.ng/umbrella/raw/branch/develop/packages/geom-fuzz/README.md'
    urls.append(fallback)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:results=list(pool.map(retrieve,urls))
    by={r['url']:r for r in results};checks=[]
    for case in cases:
        for ev in case['evidence']:
            r=by[ev['source']]
            match=normalize(ev['quote']) in normalize(r['text'])
            matched_source=ev['source']
            if not match and case['name']=='@thi.ng/geom-fuzz':
                match=normalize(ev['quote']) in normalize(by[fallback]['text'])
                if match:matched_source=fallback
            checks.append(dict(name=case['name'],url=ev['source'],matched_source=matched_source,quote=ev['quote'],matched=match,http_status=r['http_status']))
    output=dict(sources=results,checks=checks)
    (BASE/'special-verification.json').write_text(json.dumps(output,indent=2,ensure_ascii=False))
    print('Special sources:',len(results),'HTTP 200:',sum(r['http_status']==200 for r in results),'Quoted evidence matches:',sum(c['matched'] for c in checks),'/',len(checks))
    for c in checks:
        if not c['matched']:print('UNMATCHED',c['name'],c['url'],c['quote'])
