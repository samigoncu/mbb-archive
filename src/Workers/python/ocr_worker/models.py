from dataclasses import dataclass,asdict
@dataclass(frozen=True)
class Word: text:str; confidence:float; x:int; y:int; width:int; height:int
@dataclass(frozen=True)
class PageResult:
    page_number:int; width:int; height:int; text:str; average_confidence:float; words:list[Word]
    def as_dict(self):
        d=asdict(self); return d
