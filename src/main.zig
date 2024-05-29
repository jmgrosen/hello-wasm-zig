var ps_phase: f64 = 0;
var ps_phase_in: f64 = 0;
var ps_sync_in: f64 = 0;
export fn trianglePTR(freq: f64, phase: f64, sync: f64, width: f64, sr: f64) f64 {
    var pos = ps_phase;
    const step = freq / sr;
    const step2 = 2 * step;
    const step3 = 3 * step;
    const samples = 1.0 / step;
    const w = @min(0.999, @max(0.001, width));
    const a = 2.0 / w;
    const b = 2.0 / (w - 1);
    const c = 0.5 * a * b;
    const dc = 1.5 * step;
    const p1 = c * samples;
    const p2 = p1 * samples;
    const p3 = p2 * samples / 12.0;
    if (sync > 0 and ps_sync_in <= 0)
        pos = 0
    else
        pos += (phase - ps_phase_in) + step;
    while (pos >= 1) pos -= 1;
    while (pos < 0) pos += 1;
    ps_sync_in = sync;
    ps_phase_in = phase;
    ps_phase = pos;
    return algorithm(pos, step, step2, step3, w, a, b, c, dc, p1, p2, p3);
}

var buf_phase: f64 = 0;
var buf_phase_in: f64 = 0;
var buf_sync_in: f64 = 0;
export fn trianglePTRPerBuf(freq: f64, phase: f64, sync: f64, width: f64, sr: f64) f64 {
    var pos = ps_phase;
    const step = freq / sr;
    const step2 = 2 * step;
    const step3 = 3 * step;
    const samples = 1.0 / step;
    const w = @min(0.999, @max(0.001, width));
    const a = 2.0 / w;
    const b = 2.0 / (w - 1);
    const c = 0.5 * a * b;
    const dc = 1.5 * step;
    const p1 = c * samples;
    const p2 = p1 * samples;
    const p3 = p2 * samples / 12.0;
    if (sync > 0 and ps_sync_in <= 0)
        pos = 0
    else
        pos += (phase - ps_phase_in) + step;
    while (pos >= 1) pos -= 1;
    while (pos < 0) pos += 1;
    ps_sync_in = sync;
    ps_phase_in = phase;
    ps_phase = pos;
    return algorithm(pos, step, step2, step3, w, a, b, c, dc, p1, p2, p3);
}

inline fn algorithm(
    p: f64,
    t0: f64,
    t2: f64,
    t3: f64,
    w: f64,
    a: f64,
    b: f64,
    c: f64,
    dc: f64,
    p1: f64,
    p2: f64,
    p3: f64,
) f64 {
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

export fn allocFloatBuf(len: usize) [*]f64 {
    const slice = std.heap.page_allocator.alloc(f64, len) catch @panic("OOM!");
    return slice.ptr;
}

export fn free(ptr: [*]u8, len: u32) void {
    const slice = ptr[0..len];
    std.heap.page_allocator.free(slice);
}

const std = @import("std");
