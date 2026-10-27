"""Fetch public repository pages conservatively; save extracted evidence only."""
import concurrent.futures, datetime, hashlib, json, re, subprocess, time
from typing import Any
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from extract import Parser, clean
BASE=Path(__file__).parent
CACHE=BASE/'evidence';CACHE.mkdir(exist_ok=True)

def fetch(url):
    p=subprocess.run(['curl','-sSL','--compressed','--max-time','45','--retry','1','-w','\n%{http_code}\n%{url_effective}',url],capture_output=True,text=True,errors='replace')
    try:body,status,final=p.stdout.rsplit('\n',2);return body,int(status),final
    except ValueError:return '',0,url

def cachepath(url):return CACHE/(hashlib.sha256(url.encode()).hexdigest()[:20]+'.json')
def collect(url):
    dest=cachepath(url)
    if dest.exists():return json.loads(dest.read_text())
    body,status,final=fetch(url)
    result: dict[str, Any]=dict(url=url,final_url=final,http_status=status,checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
    if status==200 and 'github.com/' in final:
        m=re.search(r'<script type="application/json" data-target="react-app.embeddedData">(.*?)</script>',body,re.S)
        if m:
            try:
                payload=json.loads(m[1])['payload'];about=payload.get('sidebarAbout',{});route=payload.get('codeViewRepoRoute',{});layout=payload.get('codeViewLayoutRoute',{})
                repo=layout.get('repo',{});overview=route.get('overview',{});files=overview.get('overviewFiles',[])
                # GitHub has used both locations for overview files.
                if not files:files=route.get('overviewFiles',[])
                def find_overview(obj):
                    if isinstance(obj,dict):
                        if 'richText' in obj and obj.get('richText'):return [obj]
                        return sum((find_overview(v) for v in obj.values()),[])
                    if isinstance(obj,list):return sum((find_overview(v) for v in obj),[])
                    return []
                readmes=find_overview(route)
                rd=next((r for r in readmes if r.get('preferredFileType')=='readme'),readmes[0] if readmes else {})
                parser=Parser();parser.feed(rd.get('richText',''))
                links=[dict(label=clean(a.text()),url=urljoin(final,a.attrs.get('href',''))) for a in parser.root.find('a') if a.attrs.get('href')]
                releases=about.get('sections',{}).get('releases',{})
                if not isinstance(releases,dict):releases={}
                result.update(stars=about.get('stargazerCount'),forks=about.get('forksCount'),description=about.get('description',''),homepage=about.get('website',''),topics=[x['name'] for x in about.get('topics',[])],license=(about.get('repo',{}).get('license') or {}).get('spdxId',''),archived=repo.get('isArchived'),created_at=repo.get('createdAt',''),branch=repo.get('defaultBranch',''),commit=layout.get('refInfo',{}).get('currentOid',''),readme=clean(parser.root.text()),readme_links=links,root_files=[x['name'] for x in route.get('tree',{}).get('items',[])],release_count=releases.get('releaseCount'))
                # Actual commit dates require a separate request; never infer from a cache key.
                result['status']='verified' if result['stars'] is not None else 'metadata incomplete'
            except (KeyError,ValueError,TypeError,AttributeError) as e:result['status']='parse error: '+str(e)
        else:result['status']='repository metadata unavailable'
    else:
        parser=Parser();parser.feed(body)
        result.update(status='fetched' if status==200 else 'HTTP '+str(status),page_text=clean(parser.root.text())[:60000],page_links=[dict(label=clean(a.text()),url=urljoin(final,a.attrs.get('href',''))) for a in parser.root.find('a') if a.attrs.get('href')])
    dest.write_text(json.dumps(result,indent=2,ensure_ascii=False));return result

def repo_url(url):
    p=urlsplit(url)
    if p.netloc.lower()=='github.com':
        parts=p.path.strip('/').split('/')
        if len(parts)>=2:return 'https://github.com/'+ '/'.join(parts[:2]).removesuffix('.git')
    return url

if __name__=='__main__':
    libs=json.loads((BASE/'inventory.json').read_text())
    urls=set()
    for item in libs:
        for link in item['links']:
            if link['label'].startswith('source'):urls.add(repo_url(link['url']))
    print('Fetching',len(urls),'unique repositories',flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for i,r in enumerate(pool.map(collect,sorted(urls)),1):
            print(i,r['url'],r.get('stars'),r['status'],flush=True)
    results=[json.loads(cachepath(u).read_text()) for u in sorted(urls)]
    (BASE/'repositories.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
    print('Verified stars:',sum(r.get('stars') is not None for r in results),'/',len(results),flush=True)
