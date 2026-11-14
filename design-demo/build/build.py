"""Rebuilds design-demo/index.html from template.html.
Run from design-demo/build:  npm i tailwindcss@3 three@0.128.0 && python3 build.py"""
import subprocess, pathlib
HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
subprocess.run(["npx","tailwindcss","-c","tailwind.config.js","-i","input.css","-o","out.css","--minify"],check=True,cwd=HERE)
t=(ROOT/"template.html").read_text()
three=(HERE/"node_modules/three/build/three.min.js").read_text()
css=(HERE/"out.css").read_text()
scene=(ROOT/"scene.js").read_text()
m=(ROOT/"messages.json").read_text().replace("</","<\\/")
sd=(ROOT/"seed.json").read_text().replace("</","<\\/")
for k,v in [("/*__SCENE__*/",scene),("/*__THREE__*/",three),("/*__CSS__*/",css),("/*__MESSAGES__*/",m),("/*__SEED__*/",sd)]:
    i=t.index(k); t=t[:i]+v+t[i+len(k):]
(ROOT/"index.html").write_text(t)
print("built", len(t))
