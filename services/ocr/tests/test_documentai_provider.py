from app.providers.documentai_provider import documentai_response_to_normalized

class V:
    def __init__(self, x, y): self.x, self.y = x, y
class Poly:
    def __init__(self): self.normalized_vertices = [V(0.1, 0.1), V(0.5, 0.1), V(0.5, 0.2), V(0.1, 0.2)]
    vertices = []
class Seg:
    def __init__(self, a, b): self.start_index, self.end_index = a, b
class Anchor:
    def __init__(self, a, b): self.text_segments = [Seg(a, b)]
class Layout:
    def __init__(self, a, b, conf): self.text_anchor, self.confidence, self.bounding_poly = Anchor(a, b), conf, Poly()
class Word:
    def __init__(self, a, b, c): self.layout = Layout(a, b, c)
class Para:
    def __init__(self): self.layout = Layout(0, 11, 0.9); self.words = [Word(0, 5, 0.8), Word(6, 11, 0.9)]
class Page:
    def __init__(self):
        class Dim: width, height = 1000, 2000
        self.dimension, self.page_number, self.paragraphs = Dim(), 1, [Para()]
class Doc:
    text = "HELLO WORLD"
    pages = [Page()]
class Resp: document = Doc()

def test_documentai_maps_words_and_pixels():
    out = documentai_response_to_normalized(Resp(), "doc-1", 123)
    assert out.provider == "DOCUMENT_AI"
    assert out.fullText == "HELLO WORLD"
    assert out.pageCount == 1
    w = out.pages[0].blocks[0].paragraphs[0].words[0]
    assert w.text == "HELLO"
    assert w.confidence == 0.8
    assert w.boundingPolygon.vertices[1].x == 500.0
    assert w.boundingPolygon.vertices[2].y == 400.0
