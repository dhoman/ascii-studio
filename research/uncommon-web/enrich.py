"""Enrich source evidence with missing license texts and linked documentation."""
import concurrent.futures, json, re
from pathlib import Path
from urllib.parse import urlsplit
from collect import collect, fetch, cachepath, repo_url
BASE=Path(__file__).parent

def doc_candidate(item,repo):
    links=repo.get('readme_links',[])
    candidates=[]
    sites=[l['url'] for l in item['links'] if l['label'].startswith('site')]
    approved=sites+[repo.get('homepage',''),repo.get('url','')]
    def owned_url(url):
        parsed=urlsplit(url)
        host=parsed.netloc.lower()
        if host in ('developer.mozilla.org','allcontributors.org','docs.microsoft.com','docs.npmjs.com','docs.github.com','developers.google.com','electron.atom.io','www.electronjs.org'):
            return False
        if re.search(r'\.(?:gif|png|jpe?g|svg|webp)(?:$|\?)',url,re.I) or re.search(r'CONTRIBUTING|ROADMAP|PLAN\.md|releasing\.md|review-workflow',url,re.I):return False
        if host in ('github.com','raw.githubusercontent.com'):
            return parsed.path.lower().startswith(urlsplit(repo.get('url','')).path.lower()+'/')
        for known in approved:
            h=urlsplit(known).netloc.lower()
            if h and h not in ('github.com','www.npmjs.com'):
                domain='.'.join(h.split('.')[-2:])
                if domain in ('github.io','netlify.app','vercel.app','pages.dev'):domain=h
                if host==h or host.endswith('.'+domain) or host==domain:return True
        # Rust crate docs are hosted separately and identify the exact crate.
        if host=='docs.rs':return parsed.path.split('/')[1].lower() in (repo.get('url','').split('/')[-1].lower(),item['name'].lower())
        return False
    for link in links:
        u,label=link['url'],link['label'].strip()
        p=urlsplit(u)
        slug=repo.get('url','').split('/')[-1].lower()
        named_docs=bool(len(slug)>5 and slug in u.lower() and re.fullmatch(r'(?:official )?(?:api reference )?doc(?:umentation|s)',label,re.I))
        if p.scheme not in ('http','https') or (p.fragment and p.netloc=='github.com') or '/edit/' in u or '/badge' in u or 'img.shields.io' in u or not (owned_url(u) or named_docs):continue
        if re.search(r'\b(?:documentation|docs|api reference|getting started|guide)\b',label,re.I) or re.search(r'(^docs\.|/docs?(?:/|$)|/documentation(?:/|$)|/reference(?:/|$)|/manual(?:/|$))',p.netloc+p.path,re.I):
            score=20 if re.search(r'\b(?:documentation|docs|api reference)\b',label,re.I) else 8
            if p.netloc!='github.com':score+=4
            candidates.append((score,u,label))
    for u in sites:
        if re.search(r'/docs?(?:/|\b)|/guide|/reference|/manual',u,re.I):return u,'Directory documentation link'
    if candidates:
        _,u,label=max(candidates,key=lambda c:c[0]);return u,'Repository README: '+label
    if repo.get('readme'):return repo['url']+'#readme','Repository README; no dedicated docs identified'
    if repo.get('homepage'):return repo['homepage'],'Repository homepage; separate docs not identified'
    if sites:return sites[0],'Directory site / examples; separate docs not identified'
    return (repo.get('url','')+'#readme' if repo else ''),'Repository README fallback'

def check_doc(url):
    path=BASE/'doc-checks.jsonl'
    if path.exists():
        for line in path.read_text().splitlines():
            result=json.loads(line)
            if result['url']==url:return result
    body,status,final=fetch(url)
    return dict(url=url,http_status=status,final_url=final)

def license_evidence(repo):
    if repo.get('license') not in ['',None,'NOASSERTION']:return None
    files=repo.get('root_files',[])
    names=[n for n in files if re.match(r'^(licen[sc]e|copying)(\.|$)',n,re.I)]
    if not names:return None
    name=sorted(names,key=len)[0]
    parts=urlsplit(repo['final_url']).path.strip('/').split('/')[:2]
    u='https://raw.githubusercontent.com/'+'/'.join(parts)+'/'+repo.get('branch','main')+'/'+name
    body,status,final=fetch(u)
    if status!=200:return dict(url=u,http_status=status)
    return dict(url=u,http_status=status,text=body[:20000])

if __name__=='__main__':
    libs=json.loads((BASE/'inventory.json').read_text());repos=json.loads((BASE/'repositories.json').read_text());by={r['url']:r for r in repos}
    extra={'https://github.com/kroitor/asciichart','https://github.com/dy/linefont','https://github.com/daybrush/scenejs-timeline','https://github.com/airbnb/lottie-web'}
    for item in libs:
        for l in item['links']:
            if 'github.com/' in l['url'] and l['label'].startswith('site'):extra.add(repo_url(l['url']))
    for u in sorted(extra):
        if u not in by:
            r=collect(u);repos.append(r);by[u]=r
    (BASE/'repositories.json').write_text(json.dumps(repos,indent=2,ensure_ascii=False))
    unknown=[r for r in repos if r.get('license') in ['',None,'NOASSERTION']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for r,ev in zip(unknown,pool.map(license_evidence,unknown)):
            if ev:r['license_evidence']=ev
    (BASE/'repositories.json').write_text(json.dumps(repos,indent=2,ensure_ascii=False))
    print('License evidence fetched:',sum('license_evidence' in r for r in repos),flush=True)
    docs={}
    for item in libs:
        sources=[repo_url(l['url']) for l in item['links'] if l['label'].startswith('source')]
        repo=by.get(sources[0],{}) if sources else {}
        u,basis=doc_candidate(item,repo)
        docs[item['name']]=dict(url=u,basis=basis)
    checks={};urls=sorted(set(v['url'] for v in docs.values() if v['url']))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for i,result in enumerate(pool.map(check_doc,urls),1):
            checks[result['url']]=result
            with (BASE/'doc-checks.jsonl').open('a') as f:f.write(json.dumps(result)+'\n')
            if i%50==0:print('Docs checked:',i,'/',len(urls),flush=True)
    for value in docs.values():value['check']=checks.get(value['url'],{})
    (BASE/'documentation.json').write_text(json.dumps(docs,indent=2,ensure_ascii=False))
    print('Docs complete:',len(checks),'HTTP 200:',sum(r['http_status']==200 for r in checks.values()),flush=True)
