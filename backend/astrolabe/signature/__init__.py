from .obj import Obj, ObjMeta, ProofStatus
from .mor import Mor, MorMeta
from .state import ViewState, SessionState

# Backward compatibility aliases
Node = Obj
NodeMeta = ObjMeta
Edge = Mor
EdgeMeta = MorMeta

__all__ = [
    "Obj", "ObjMeta", "ProofStatus",
    "Mor", "MorMeta",
    "ViewState", "SessionState",
    # Backward compatibility
    "Node", "NodeMeta", "Edge", "EdgeMeta",
]
