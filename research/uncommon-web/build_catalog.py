"""Build the human-readable catalog and portable searchable HTML from evidence."""
import collections, csv, datetime, io, json, re, subprocess
from pathlib import Path
from urllib.parse import urlsplit
from collect import repo_url
BASE=Path(__file__).parent
SOURCE_SCRIPT='/opt/data/profiles/ascii-studio/skills/research/grounded-citations/scripts/sources.py'
LEDGER=str(BASE/'sources.json')
DIRECTORY='https://webdev.teknium.io/'
SHORTLIST={
    'textmode.js':'Current media-lab renderer; inspect distribution/source availability.',
    'three.js':'Foundation for the planned lit 3D scene and custom glyph pass.',
    'three.js AsciiEffect':'Baseline for comparing a custom glyph pass, not the final renderer.',
    'three.js WebGPU + TSL':'Explore node-based shaders and backend fallbacks for later rendering.',
    'postprocessing':'Compare scene-wide ASCII, pixelation and other post-processing passes.',
    'pixi-filters':'Reference for CRT, glow and pixel treatments; Pixi integration is separate.',
    'Paper Shaders':'Reference for ordered dithering, material treatments and image effects.',
    'dithercn':'Dither-grid visual reference; React/shadcn components, not a game renderer.',
    'rot.js':'Roguelike generation, visibility and pathfinding for a text-oriented game.',
    'play.core':'Character-cell animation and interaction reference.',
    'Ratzilla':'Text-grid UI reference; Rust/WASM integration cost.',
    'Tweakpane':'Developer-facing live tuning of render parameters.',
    'react-three-rapier':'3D physics if we adopt a React Three Fiber scene.',
    'cannon-es':'Physics option without requiring React Three Fiber.',
    'three-msdf-text-utils':'Crisp scalable scene text, distinct from full-frame ASCII conversion.',
    'ZzFX':'Small procedural game-sound option.',
    'LittleJS':'Compact 2D game option; not the planned Three.js scene renderer.',
    'Theatre.js':'Art-directed camera/light sequences; core/editor licenses differ.',
}
NOTES={
    'textmode.js':['README: MIT covers the published distribution; TypeScript development source and build tooling are private.'],
    'Vaul':['README explicitly says this repo is unmaintained; the author does not expect to return in the near future.'],
    'threejs-toys':['README says no longer maintained (November 2024); successor threejs-components is sponsors-only.'],
    'Theatre.js':['README distinguishes Apache-2.0 core from AGPL-3.0 Studio. It also says 1.0 development temporarily moved to a private repo.'],
    'GSAP':['Custom GreenSock Standard License, not MIT. README says the toolset is free including commercial use; inspect its actual license terms.'],
    'GSAP SplitText':['A plugin in the GSAP repository, not a separate library with its own star count. Custom GreenSock Standard License applies.'],
    'React Bits':['MIT + Commons Clause: not plain MIT. License restricts selling, sublicensing or redistributing the components themselves.'],
    'Neat':['MIT + Commons Clause. README excludes selling the software, paid template/theme-builder use and offering it as a paid service; watermark-removal keys are a separate purchase.'],
    'Hyperiux Vault':['README: public repository covers free effects; Pro effect source is private and served through a protected API.'],
    'Rive':['This source is the web runtime, not the hosted authoring product. Runtime licensing does not establish editor/service pricing.'],
    'asciichart + figlet':['One directory card combines two libraries. Main stars below are for figlet.js; asciichart is separately linked with its own metadata.'],
    'Wavefont + Linefont':['One directory entry combines two fonts. Main stars are for Wavefont; Linefont is separately linked.'],
    'Scene.js + Timeline':['The visual timeline is a companion repository. Main stars are for Scene.js.'],
    'Lottie + lottie-interactivity':['Main repository is the interactivity layer; lottie-web is the separate animation runtime.'],
}
COMPANIONS={
    'asciichart + figlet':['https://github.com/kroitor/asciichart'],
    'Wavefont + Linefont':['https://github.com/dy/linefont'],
    'Scene.js + Timeline':['https://github.com/daybrush/scenejs-timeline'],
    'Lottie + lottie-interactivity':['https://github.com/airbnb/lottie-web'],
}

def license_for(repo,directory_license):
    spdx=repo.get('license','')
    evidence=repo.get('license_evidence',{});text=evidence.get('text','')
    if 'Commons Clause' in text:return 'MIT + Commons Clause','Repository license text'
    if spdx and spdx!='NOASSERTION':return spdx,'GitHub license detection (root scope)'
    if 'Permission is hereby granted, free of charge' in text and 'THE SOFTWARE IS PROVIDED "AS IS"' in text:return 'MIT','Repository license text'
    if 'SIL OPEN FONT LICENSE' in text.upper():return 'OFL-1.1','Repository license text'
    if 'Apache License' in text and 'Version 2.0' in text:return 'Apache-2.0','Repository license text'
    if 'GNU GENERAL PUBLIC LICENSE' in text and 'Version 3' in text:return 'GPL-3.0; inspect file','Repository license text'
    if 'GNU AFFERO GENERAL PUBLIC LICENSE' in text:return 'AGPL; inspect file','Repository license text'
    if spdx=='NOASSERTION':return directory_license or 'Custom / mixed; inspect license','Directory label; GitHub reports nonstandard/mixed license'
    return directory_license or 'Not identified','Directory label only; not independently classified'

def citation_add(urls):
    urls=list(dict.fromkeys(urls))
    for start in range(0,len(urls),80):
        subprocess.run(['python',SOURCE_SCRIPT,'--ledger',LEDGER,'add',*urls[start:start+80]],check=True,capture_output=True,text=True)
    sources=json.loads(subprocess.check_output(['python',SOURCE_SCRIPT,'--ledger',LEDGER,'list','--json'],text=True))
    return {s['url'].rstrip('/'):s['id'] for s in sources}

def main():
    libs=json.loads((BASE/'inventory.json').read_text());demos=json.loads((BASE/'demos.json').read_text());repos=json.loads((BASE/'repositories.json').read_text());docs=json.loads((BASE/'documentation.json').read_text())
    by={r['url']:r for r in repos}
    for r in repos:by[r.get('final_url',r['url']).rstrip('/')]=r
    special_path=BASE/'special-cases.json'
    special={x['name']:x for x in json.loads(special_path.read_text())} if special_path.exists() else {}
    demo_by_name=collections.defaultdict(list)
    for d in demos:demo_by_name[d['name']].append(d)
    scoped=collections.Counter(repo_url(next((l['url'] for l in item['links'] if l['label'].startswith('source')),'')) for item in libs)
    output=[]
    for item in libs:
        name=item['name'];sp=special.get(name,{})
        source=next((l['url'] for l in item['links'] if l['label'].startswith('source')),'')
        if sp.get('repo'):source=sp['repo']
        root=repo_url(source) if source else ''
        repo=by.get(root,{})
        site=next((l['url'] for l in item['links'] if l['label'].startswith('site')),'')
        package=next((l['url'] for l in item['links'] if l['label'].startswith('npm')),'')
        footer=demo_by_name[name][0]['footer'];directory_license=footer.split(' · ')[0] if ' · ' in footer else ''
        license_name,license_basis=license_for(repo,directory_license)
        notes=list(NOTES.get(name,[]))
        special_notes=sp.get('notes',[])
        if isinstance(special_notes,str):special_notes=[special_notes]
        notes.extend(special_notes)
        if sp.get('license'):license_name=sp['license'];license_basis='Special-case primary-source review'
        if name=='dithercn':license_name='MIT (site declaration)'
        if name=='Aceternity UI':license_name='Item-specific / custom Pro terms'
        if name=='Crucible':license_name='MIT free / proprietary Pro'
        if name in ['GSAP','GSAP SplitText']:license_name='GreenSock Standard License';license_basis='Repository README license section'
        if name=='Theatre.js':license_name='Apache-2.0 core / AGPL-3.0 Studio';license_basis='Repository README package-level distinction'
        if name in ['React Bits','Neat']:license_name='MIT + Commons Clause';license_basis='Repository license text and README'
        stars=repo.get('stars',sp.get('stars'))
        archived=repo.get('archived')
        if archived:notes.append('GitHub marks this repository archived/read-only. No claim is made that all forks or successors are inactive.')
        if scoped[root]>1:notes.append(f'Repository shared by {scoped[root]} catalog entries; stars are repository-wide, not specific to this component.')
        if stars is None:notes.append('No verified star count is available; this is not a zero-star claim.')
        if root and not repo.get('readme'):notes.append('GitHub README metadata unavailable for this source; consult the linked host and special-case evidence.')
        if not root:notes.append('No authoritative public repository identified; do not substitute an unofficial clone.')
        if 'Directory label' in license_basis or 'not independently' in license_basis:notes.append('License needs manual confirmation at the exact package/version; directory label is not a legal audit.')
        doc=docs.get(name,{})
        doc_url=sp.get('docs') or doc.get('url') or site or (root+'#readme' if root else '')
        if isinstance(doc_url,list):doc_url=doc_url[0] if doc_url else site
        doc_basis='Primary-source special-case review' if sp.get('docs') else doc.get('basis','Documentation link not found')
        check=doc.get('check',{}) if doc_url==doc.get('url') else {}
        if check and check.get('http_status')!=200:notes.append(f'Documentation link returned HTTP {check.get("http_status")} to the automated check; it may be moved or block automated clients. Repository README is a fallback.')
        companions=[]
        for u in COMPANIONS.get(name,[]):
            c=by.get(u,{})
            companions.append(dict(repo=u,stars=c.get('stars'),license=c.get('license'),description=c.get('description','')))
            notes.append(f'Companion {u}: {c.get("stars","unverified")} repo stars; {c.get("license") or "license unclassified"}.')
        sources=[DIRECTORY]+([root] if root else [])
        if repo.get('license_evidence',{}).get('http_status')==200:sources.append(repo['license_evidence']['url'])
        sources.extend(sp.get('sources',[]));sources.extend(COMPANIONS.get(name,[]));sources=list(dict.fromkeys(sources))
        caveat=bool(archived or name in NOTES or not license_name or any(x in license_name.lower() for x in ['commons','custom','unknown','not identified','gpl','greensock']) or 'Directory label' in license_basis or 'not independently' in license_basis)
        repo_status='Archived / read-only' if archived else ('Public / not archived' if archived is False else ('No public repo verified' if not root else repo.get('status','Host-specific; see notes')))
        output.append(dict(name=name,categories=item['categories'],frameworks=item['frameworks'],tags=item['tags'],capabilities=' '.join(item['capabilities']),repo_description=repo.get('description',''),repo=root,component_source=source,website=site,docs=doc_url,docs_basis=doc_basis,docs_http_status=check.get('http_status'),npm=package,stars=stars,star_scope=('Parent/shared repository' if scoped[root]>1 or source!=root or name in COMPANIONS else 'Repository total') if stars is not None else 'Not available / unverified',forks=repo.get('forks'),license=license_name,license_basis=license_basis,repo_status=repo_status,archived=archived,release_count=repo.get('release_count'),created_at=repo.get('created_at',''),commit=repo.get('commit',''),checked_at=repo.get('checked_at',datetime.datetime.now(datetime.timezone.utc).isoformat()),demo_urls=item['demos'],demo_builds=list(dict.fromkeys(d['footer'] for d in demo_by_name[name])),installs=item['installs'],notes=notes,shortlist=name in SHORTLIST,fit=SHORTLIST.get(name,''),caveat=caveat,sources=sources,companions=companions,readme_excerpt=repo.get('readme','')[:1800],special_evidence=sp.get('evidence',[])))
        row=output[-1]
        row['star_host']=urlsplit(root).netloc if stars is not None else ''
        if name.startswith('@thi.ng/'):
            row['star_scope']='Parent/shared repository'
        if sp and root and not root.startswith('https://github.com/'):
            row['repo_status']='Non-GitHub repository; see primary-source notes'
        row['caveat']=row['caveat'] or name in ('Aceternity UI','Crucible')
    method=[
        'Scope: full HTML snapshot of webdev.teknium.io retrieved 2026-10-22 UTC. Reconciled exactly 430 demo cards, 393 distinct displayed library names and 22 families. This snapshot supersedes an older cached extraction that reported 294 libraries.',
        'One row per displayed library name; repeated demos are grouped. Some names denote plugins, example collections or several libraries together, not standalone frameworks. Combined entries retain the directory name and separately identify companion repositories.',
        'Repository inspection covers the public repository landing page, README, file listing, current commit identifier, detected license, exact star/fork counts, archive flag and GitHub release count. It is not a full source-code, security, performance or dependency audit; repositories were not all cloned or executed.',
        'Capabilities are the directory descriptions, not benchmarked guarantees. Repository descriptions and README excerpts are separately labeled. ASCII Studio shortlist and fit notes are editorial judgments, not objective rankings.',
        'Documentation links prefer repository README links explicitly labeled documentation, docs or API reference, then directory docs links, then repository homepages/sites or README fallback. Each automated candidate received an HTTP check; blocked/moved links are flagged. A homepage/examples fallback is explicitly labeled and is not presented as verified dedicated documentation.',
        'Stars are exact repository totals observed at retrieval time, never component-specific. Shared repositories and combined entries are identified. Unavailable is distinct from zero. GitHub release count is not npm version or proof of current maintenance. Not archived does not mean actively maintained; no last-commit date is inferred.',
        'Licenses prefer explicit repository detection or fetched license text, with README overrides for mixed/custom cases. Directory-only fallback labels are explicitly marked unverified. Root-repository license can differ from individual packages, examples, fonts, assets, hosted products or Pro components; confirm the exact dependency before use.',
        'Sources are linked per entry; local evidence JSON preserves extracted README/metadata and timestamps. CSV and JSON contain additional fields such as all demo links, installation examples, companion repos, demo build/version labels, observed commit and documentation HTTP status. Demo build versions are not claimed to be current releases.'
    ]
    payload=dict(meta=dict(checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),directory=DIRECTORY,demo_count=len(demos),library_count=len(output),family_count=len(set(c for r in output for c in r['categories'])),method=method),libraries=output)
    (BASE/'catalog.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False))
    fields=list(output[0]);csvbuffer=io.StringIO();writer=csv.DictWriter(csvbuffer,fieldnames=fields);writer.writeheader()
    for row in output:
        writer.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()})
    (BASE/'catalog.csv').write_text(csvbuffer.getvalue())
    html=(BASE/'catalog.template.html').read_text().replace('__CATALOG_DATA__',json.dumps(payload,ensure_ascii=False).replace('<','\\u003c'))
    (BASE/'index.html').write_text(html)
    ids=citation_add([u for r in output for u in r['sources']])
    def cite(url):
        source_id=ids[url.rstrip('/')]
        return f'[{source_id}]'
    def cell(s):return str('—' if s is None or s=='' else s).replace('|','\\|').replace('\n',' ')
    md=['# Uncommon Web — complete repository catalog','',f'Checked: {payload["meta"]["checked_at"]}', '',f'393 library entries · 430 demos · 22 families. Directory snapshot.{cite(DIRECTORY)}','', '## Reading this list','']
    md.extend(m+cite(DIRECTORY) for m in method[:1]);md.extend(['']+method[1:]+['','## ASCII Studio shortlist',''])
    for r in output:
        if r['shortlist']:md.append(f'- {r["name"]}: {r["fit"]} Repository: {r["repo"] or "not verified"}. Stars: {r["stars"] if r["stars"] is not None else "unavailable"}. '+''.join(cite(u) for u in r['sources'][:2]))
    categories=list(dict.fromkeys(c for r in output for c in r['categories']))
    for category in categories:
        primary=[r for r in output if r['categories'][0]==category]
        if not primary:
            cross_names=', '.join(r['name'] for r in output if category in r['categories'])
            md.extend(['','## '+category,'','Cross-listed libraries (full entries under their first family): '+cross_names+'.'+cite(DIRECTORY)])
            continue
        md.extend(['','## '+category,'','| Library | Repository | Docs / guide | Stars (repo-wide) | Stack | License | Capabilities | Status / caveats | Sources |','|---|---|---|---:|---|---|---|---|---|'])
        for r in output:
            if category!=r['categories'][0]:continue
            notes=r['repo_status']+'. '+' '.join(r['notes'])
            values=[r['name'],r['repo'] or 'Not verified',r['docs'],r['stars'] if r['stars'] is not None else 'Unavailable',', '.join(r['frameworks'])+'; '+', '.join(r['tags']),r['license']+' ('+r['license_basis']+')',r['capabilities'],notes,''.join(cite(u) for u in r['sources'])]
            md.append('| '+' | '.join(cell(v) for v in values)+' |')
    draft=BASE/'catalog.md';draft.write_text('\n'.join(md)+'\n')
    subprocess.run(['python',SOURCE_SCRIPT,'--ledger',LEDGER,'render','--replace-in',str(draft)],check=True,capture_output=True,text=True)
    print(json.dumps(dict(libraries=len(output),demos=len(demos),families=len(categories),star_rows=sum(r['stars'] is not None for r in output),no_repo=[r['name'] for r in output if not r['repo']],archived=[r['name'] for r in output if r['archived']],shortlist=sum(r['shortlist'] for r in output)),indent=2))
if __name__=='__main__':main()
