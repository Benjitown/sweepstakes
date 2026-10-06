// The swirling pixel felt behind everything (WebGL).
import { $, reduced } from '../core/util.js';
import { S, asc } from '../core/state.js';
import { UI } from './ui.js';

export const Background = (() => {
  const FELTS = [
    [[.12, .36, .28], [.04, .17, .13], [.2, .55, .4]],
    [[.08, .28, .42], [.02, .1, .18], [.18, .5, .68]],
    [[.3, .17, .46], [.09, .05, .17], [.56, .33, .76]],
    [[.46, .1, .16], [.14, .03, .06], [.76, .22, .28]],
    [[.22, .18, .08], [.04, .03, .02], [.86, .66, .2]],
  ];
  const MOODS = {
    hot: [[.55, .33, .08], [.17, .07, .03], [.95, .6, .12], 1.6],
    danger: [[.62, .14, .14], [.05, .13, .36], [.9, .3, .25], 2.6],
    bust: [[.26, .05, .07], [.06, .02, .03], [.45, .08, .12], .5],
    asc: [[.4, .24, .62], [.07, .04, .15], [.95, .8, .3], 2.2],
    gold: [[.5, .4, .1], [.12, .08, .02], [1, .85, .35], 2.4],
  };
  const cv = $('#bg'), st = { c: FELTS[0].map(c => c.slice()), spin: 1, t: 0 };
  let target = [...FELTS[0], 1], gl = null, U = {}, last = 0;
  try { gl = cv.getContext('webgl', { antialias: false, depth: false, alpha: false }); } catch (e) { gl = null; }
  if (gl) {
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;uniform vec2 R;uniform float T;uniform vec3 A;uniform vec3 B;uniform vec3 C;
    void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);float r=length(uv);
    float a=atan(uv.y,uv.x)+T*.06+r*2.4-T*.04*r;vec2 p=vec2(cos(a),sin(a))*r*2.6;
    for(int i=0;i<5;i++){float fi=float(i);p+=.55*vec2(sin(p.y*1.7+T*.23+fi),cos(p.x*1.5-T*.19+fi*1.3));}
    float v=.5+.5*sin(p.x*1.2+p.y*.8);float w=.5+.5*sin(length(p)*1.8-T*.3);
    vec3 col=mix(B,A,smoothstep(.15,.85,v));col=mix(col,C,smoothstep(.6,.95,w)*.85);
    col=floor(col*14.)/14.;col*=1.-.32*r;gl_FragColor=vec4(col,1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs), pr = v && f && gl.createProgram();
    if (pr) { gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); }
    if (!pr || !gl.getProgramParameter(pr, gl.LINK_STATUS)) gl = null;
    else {
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['R', 'T', 'A', 'B', 'C']) U[n] = gl.getUniformLocation(pr, n);
    }
  }
  function draw(dt) {
    if (!gl) return;
    const k = reduced ? 1 : Math.min(1, dt * 1.8);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) st.c[j][i] += (target[j][i] - st.c[j][i]) * k;
    st.spin += (target[3] - st.spin) * k;
    if (!reduced) st.t += dt * st.spin;
    const w = Math.max(1, Math.ceil(innerWidth / 4)), h = Math.max(1, Math.ceil(innerHeight / 4));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.R, w, h); gl.uniform1f(U.T, st.t);
    gl.uniform3fv(U.A, st.c[0]); gl.uniform3fv(U.B, st.c[1]); gl.uniform3fv(U.C, st.c[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < 33) return;
    const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now; draw(dt);
  }
  if (gl) { if (reduced) { draw(0); addEventListener('resize', () => draw(0)); } else requestAnimationFrame(loop); }
  let flash = 0;
  return {
    refresh() {
      const name = UI.moodLock || (performance.now() < flash ? 'gold' : S.streak >= 5 ? 'hot' : 'felt');
      target = MOODS[name] || [...FELTS[Math.min(4, asc())], 1];
      if (reduced) draw(0);
    },
    flashGold(ms = 2500) { flash = performance.now() + ms; this.refresh(); setTimeout(() => this.refresh(), ms + 50); },
  };
})();
