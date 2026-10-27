"""Extract a saved directory snapshot without executing third-party scripts."""
from html.parser import HTMLParser
from pathlib import Path
import json, re
from urllib.parse import urljoin

class Node:
    def __init__(self,tag='',attrs=(),parent=None):
        self.tag,self.attrs,self.parent,self.children=tag,dict(attrs),parent,[]
    def text(self):
        return ''.join(c if isinstance(c,str) else c.text() for c in self.children)
    def find(self,tag=None,cls=None):
        out=[]
        for c in self.children:
            if isinstance(c,Node):
                if (not tag or c.tag==tag) and (not cls or cls in c.attrs.get('class','').split()):out.append(c)
                out.extend(c.find(tag,cls))
        return out
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.root=Node();self.current=self.root
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs,self.current);self.current.children.append(n)
        if tag not in {'meta','link','img','input','br','hr','source','wbr','area','base','embed','param','track','col'}:self.current=n
    def handle_endtag(self,tag):
        n=self.current
        while n.parent:
            if n.tag==tag:self.current=n.parent;break
            n=n.parent
    def handle_data(self,data):self.current.children.append(data)

def clean(s):return re.sub(r'\s+',' ',s).strip()
def first(n,tag=None,cls=None):
    found=n.find(tag,cls);return clean(found[0].text()) if found else ''
base=Path(__file__).parent
p=Parser();p.feed((base/'site.html').read_text())
rows=[]
for sec in p.root.find('section','sec'):
    category=first(sec,'h2')
    for card in sec.find('article','card'):
        h=card.find('h3')[0]
        name=clean(''.join(c if isinstance(c,str) else '' for c in h.children))
        links=[{'label':clean(a.text()),'url':urljoin('https://webdev.teknium.io/',a.attrs.get('href',''))} for a in card.find('a')]
        footer_nodes=card.find(cls='links')
        footer=first(footer_nodes[0],'span') if footer_nodes else ''
        rows.append(dict(name=name,category=category,category_id=sec.attrs['id'],id=card.attrs['id'],framework=card.attrs.get('data-fw',''),tags=card.attrs.get('data-tags','').split(),tagline=first(card,cls='tagline'),capabilities=first(card,cls='blurb'),install=first(card,cls='install').removesuffix('copy').strip(),links=links,footer=footer))
(base/'demos.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
libs={}
for row in rows:
    key=row['name'].casefold()
    if key not in libs:libs[key]=dict(name=row['name'],categories=[],frameworks=[],tags=[],demos=[],links=[],capabilities=[],installs=[])
    item=libs[key]
    for target,values in [('categories',[row['category']]),('frameworks',[row['framework']]),('tags',row['tags']),('links',row['links']),('capabilities',[row['capabilities']]),('installs',[row['install']])]:
        for v in values:
            if v and v not in item[target]:item[target].append(v)
    item['demos'].append('https://webdev.teknium.io/#'+row['id'])
(base/'inventory.json').write_text(json.dumps(list(libs.values()),indent=2,ensure_ascii=False))
print('Demos:',len(rows),'Libraries:',len(libs),'Families:',len(p.root.find('section','sec')))
for r in list(libs.values())[:12]:print(r['name'],r['links'])
