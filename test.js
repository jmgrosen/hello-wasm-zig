// const fs = require('fs');
// const source = fs.readFileSync("./main.wasm");
// const mod = new Uint8Array(source)
const source = "./main.wasm"
const response = await fetch(source)
const mod = await response.arrayBuffer()

const dt = 440.0 / 44_100.0;

const magic_number = 1024
const freq = 440.0
const width = 0.5

console.log("helloooo");

WebAssembly.instantiate(mod).then(result => {

  // let jsBuf = new Float64Array(magic_number);
  // for (let i = 0; i < magic_number; i++) {
  //   jsBuf[i] = dt * i;
  // }

  //   let zigBuf = new Float64Array(
  //     memory.buffer,
  //     result.instance.exports.allocFloatBuf(magic_number) - memory.buffer,
  //     //magic_number
  // );
  // for (let i = 0; i < magic_number; i++) {
  //   zigBuf[i] = jsBuf[i];
  // }

  // //   const jsFunc = (buffer, length) => {
  // //     for (let i = 0; i < length; i++) {
  // //        buffer[i] = Math.sin(buffer[i]);
  // //    }
  // // }

    let jsBuf = new Float64Array(magic_number)
    let zigBuf = new Float64Array(magic_number)
    const zigInternalPtr = result.instance.exports.allocFloatBuf(magic_number)
    const iterations = 1000
    
    let per_sum = 0.0
    for (let j = 0; j < iterations; j++) {
        const start = performance.now();
        for (let i = 0; i < magic_number; i++) {
            zigBuf[i] = result.instance.exports.trianglePTR(freq, 0, 0, width, 44_100)
        }
        const end = performance.now();
        per_sum += (end - start)
    }
    
    let js_sum = 0.0
    for (let j = 0; j < iterations; j ++) {
        const start = performance.now();
        for (let i = 0; i < magic_number; i++) {
            jsBuf[i] = trianglePTRJS(freq, 0, 0, width, 44_100)
        }
        const end = performance.now();
        js_sum += (end - start)
    }

    let internal_sum = 0.0
    for (let j = 0; j < iterations; j++) {
        const start = performance.now();
        result.instance.exports.trianglePTRBuf(zigInternalPtr, magic_number, freq, 0, 0, width, 44_100)
        const end = performance.now();
        internal_sum += (end - start)
    }

    console.log("JAVASCRIPT: " + (js_sum / iterations))
    console.log("ZIG: " + (per_sum / iterations))
    console.log("ZIG INTERNAL: " + (internal_sum / iterations))

    const zigInternalBuf = new Float64Array(result.instance.exports.memory.buffer, zigInternalPtr, magic_number);
    console.log(zigInternalBuf)
    console.log(zigBuf)
    console.log(jsBuf)
    
  // free(zigBuf.byteOffset, zigBuf.byteLength);
})

const algorithm = (p, t0, t2, t3, w, a, b, c, dc, p1, p2, p3) => {
    if (p < w) {
        if (p >= t3)
            return a * p - a * dc - 1
        else if (p < t0)
            return b * p - b * dc - 1 - 0.5 * p3 * p * p * p * p
        else if (p < t2)
            return b * p - b * dc - 1 + p3 * p * p * p * p - 0.5 * p2 * p * p * p + 0.75 * p1 * p * p - 0.5 * c * p + 0.125 * c * t0
        else
            return b * p - b * dc - 1 - 0.5 * p3 * p * p * p * p + 0.5 * p2 * p * p * p - 2.25 * p1 * p * p + 3.5 * c * p - 1.875 * c * t0;
    } else {
        const pw = p - w;
        if (pw >= t3)
            return b * pw - b * dc + 1
        else if (pw < t0)
            return a * pw - a * dc + 1 + 0.5 * p3 * pw * pw * pw * pw
        else if (pw < t2)
            return a * pw - a * dc + 1 - p3 * pw * pw * pw * pw + 0.5 * p2 * pw * pw * pw - 0.75 * p1 * pw * pw + 0.5 * c * pw - 0.125 * c * t0
        else
            return a * pw - a * dc + 1 + 0.5 * p3 * pw * pw * pw * pw - 0.5 * p2 * pw * pw * pw + 2.25 * p1 * pw * pw - 3.5 * c * pw + 1.875 * c * t0;
    }
}

let js_phase = 0
let js_phase_in = 0
let js_sync_in = 0
const trianglePTRJS = (freq, phase, sync, width, sr) => {
    let pos = js_phase
    const step = freq / sr
    const step2 = 2 * step
    const step3 = 3 * step
    const samples = 1.0 / step
    const w = Math.min(0.999, Math.max(0.001, width))
    const a = 2.0 / w
    const b = 2.0 / (w - 1)
    const c = 0.5 * a * b
    const dc = 1.5 * step
    const p1 = c * samples
    const p2 = p1 * samples
    const p3 = p2 * samples / 12.0
    if (sync > 0 && js_sync_in <= 0)
        pos = 0
    else
        pos += (phase - js_phase_in) + step
    while (pos >= 1) pos -= 1
    while (pos < 0) pos += 1
    js_sync_in = sync
    js_phase_in = phase
    js_phase = pos
    return algorithm(pos, step, step2, step3, w, a, b, c, dc, p1, p2, p3)
}

