"""avatar-src + 3D 렌더러(math/vrm/avatar)를 하나의 assets/avatar.html 로 합친다. (VRM 모델은 별도 파일로 둔다)"""
import os

here = os.path.dirname(os.path.abspath(__file__))
core = os.path.join(here, '..', '..', 'packages', 'avatar-core')

def read_text(path):
    with open(path, encoding='utf-8') as handle:
        return handle.read()

js = ''.join(read_text(os.path.join(core, name)) + '\n' for name in ['math.js', 'vrm.js', 'avatar.js'])
js += read_text(os.path.join(here, 'avatar-src', 'boot.js'))
template = read_text(os.path.join(here, 'avatar-src', 'tpl.html'))
output = template.replace('__SCRIPTS__', js)
with open(os.path.join(here, 'assets', 'avatar.html'), 'w', encoding='utf-8', newline='\n') as handle:
    handle.write(output)
print('assets/avatar.html', len(output) // 1024, 'KB')
