import subprocess, tempfile, os

def render(spec, source_path, output_path):
    work=tempfile.mkdtemp(prefix='editia-'); clips=[]
    for i,s in enumerate(spec.get('segments',[])):
        out=os.path.join(work,f'{i:04d}.mp4'); start=float(s.get('source_start',0)); dur=max(.05,float(s.get('source_end',start+.05))-start)
        vf='format=yuv420p'
        subprocess.run(['ffmpeg','-y','-ss',str(start),'-i',source_path,'-t',str(dur),'-vf',vf,'-an',out],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); clips.append(out)
    lst=os.path.join(work,'concat.txt'); open(lst,'w').write('\n'.join("file '"+p.replace("'","'\\''")+"'" for p in clips))
    subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i',lst,'-c','copy',output_path],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return output_path
