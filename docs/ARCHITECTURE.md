# Architecture

Reference A -> audio/video/effects/transition/text/color/motion analysis -> structured edit spec.

Source B -> source matching -> adapted timeline -> render -> QC -> targeted autocorrection -> final MP4.

The agents are specialized stages with explicit JSON contracts. The master editor combines their outputs; it does not pretend to recover hidden editor-project metadata.