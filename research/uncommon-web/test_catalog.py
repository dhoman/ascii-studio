"""Acceptance checks for snapshot coverage and generated catalog integrity."""
import csv, json, re, unittest
from pathlib import Path
BASE=Path(__file__).parent

class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog=json.loads((BASE/'catalog.json').read_text())
        cls.rows=cls.catalog['libraries']
        cls.inventory=json.loads((BASE/'inventory.json').read_text())
        cls.demos=json.loads((BASE/'demos.json').read_text())
    def test_snapshot_counts(self):
        self.assertEqual(len(self.rows),393)
        self.assertEqual(len(self.demos),430)
        self.assertEqual(len({c for r in self.rows for c in r['categories']}),22)
        self.assertEqual({r['name'] for r in self.rows},{r['name'] for r in self.inventory})
        self.assertEqual(len({r['name'].casefold() for r in self.rows}),393)
    def test_no_demo_lost(self):
        self.assertEqual(sum(len(r['demo_urls']) for r in self.rows),430)
        self.assertEqual({u for r in self.rows for u in r['demo_urls']},{'https://webdev.teknium.io/#'+r['id'] for r in self.demos})
    def test_required_fields_and_star_semantics(self):
        for r in self.rows:
            with self.subTest(name=r['name']):
                for key in ['name','capabilities','license','docs','sources','repo_status','checked_at']:
                    self.assertTrue(r[key],key)
                self.assertTrue(r['stars'] is None or isinstance(r['stars'],int))
                if r['stars'] is not None:self.assertGreaterEqual(r['stars'],0)
                if r['repo'].startswith('https://github.com/'):
                    self.assertRegex(r['repo'],r'^https://github.com/[^/]+/[^/]+$')
    def test_csv_matches_json(self):
        with (BASE/'catalog.csv').open() as f:rows=list(csv.DictReader(f))
        self.assertEqual(len(rows),393)
        self.assertEqual([r['name'] for r in rows],[r['name'] for r in self.rows])
        for c,j in zip(rows,self.rows):
            self.assertEqual(c['stars'],'' if j['stars'] is None else str(j['stars']))
    def test_all_stars_have_evidence(self):
        evidence=json.loads((BASE/'repositories.json').read_text())
        known={(r['url'],r.get('stars')) for r in evidence}
        for r in evidence:known.add((r.get('final_url','').rstrip('/'),r.get('stars')))
        specials=json.loads((BASE/'special-cases.json').read_text())
        known.update((r.get('repo',''),r.get('stars')) for r in specials)
        for r in self.rows:
            if r['stars'] is not None:self.assertIn((r['repo'],r['stars']),known,r['name'])
    def test_html_embedded_data(self):
        html=(BASE/'index.html').read_text()
        match=re.search(r'<script id="data" type="application/json">(.*?)</script>',html,re.S)
        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(json.loads(match[1]),self.catalog)
        self.assertNotIn('__CATALOG_DATA__',html)
    def test_important_caveats(self):
        by={r['name']:r for r in self.rows}
        self.assertIn('Commons Clause',by['React Bits']['license'])
        self.assertIn('AGPL',by['Theatre.js']['license'])
        self.assertTrue(by['Shopify Draggable']['archived'])
        self.assertIn('unmaintained',' '.join(by['Vaul']['notes']))
        self.assertIn('private',' '.join(by['textmode.js']['notes']))
    def test_shared_repo_counts_are_labeled(self):
        from collections import Counter
        counts=Counter(r['repo'] for r in self.rows if r['repo'])
        for r in self.rows:
            if r['repo'] and counts[r['repo']]>1 and r['stars'] is not None:
                self.assertEqual(r['star_scope'],'Parent/shared repository',r['name'])

if __name__=='__main__':unittest.main()
