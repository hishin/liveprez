/**
 * Created by hijungshin on 11/21/16.
 */
/// <summary>
/// Generic color space color to alpha.
/// </summary>
/// <param name="pA">Pixel alpha.</param>
/// <param name="p1">Pixel 1st channel.</param>
/// <param name="p2">Pixel 2nd channel.</param>
/// <param name="p3">Pixel 3rd channel.</param>
/// <param name="r1">Reference 1st channel.</param>
/// <param name="r2">Reference 2nd channel.</param>
/// <param name="r3">Reference 3rd channel.</param>
/// <param name="mA">Maximum alpha value.</param>
/// <param name="mX">Maximum channel value.</param>
static void GColorToAlpha(ref double pA, ref double p1, ref double p2, ref double p3, double r1, double r2, double r3, double mA = 1.0, double mX = 1.0) {
    double aA, a1, a2, a3;
    // a1 calculation: minimal alpha giving r1 from p1
    if (p1 > r1) a1 = mA * (p1 - r1) / (mX - r1);
    else if (p1 < r1) a1 = mA * (r1 - p1) / r1;
    else a1 = 0.0;
    // a2 calculation: minimal alpha giving r2 from p2
    if (p2 > r2) a2 = mA * (p2 - r2) / (mX - r2);
    else if (p2 < r2) a2 = mA * (r2 - p2) / r2;
    else a2 = 0.0;
    // a3 calculation: minimal alpha giving r3 from p3
    if (p3 > r3) a3 = mA * (p3 - r3) / (mX - r3);
    else if (p3 < r3) a3 = mA * (r3 - p3) / r3;
    else a3 = 0.0;
    // aA calculation: max(a1, a2, a3)
    aA = a1;
    if (a2 > aA) aA = a2;
    if (a3 > aA) aA = a3;
    // apply aA to pixel:
    if (aA >= mA / mX) {
        pA = aA * pA / mA;
        p1 = mA * (p1 - r1) / aA + r1;
        p2 = mA * (p2 - r2) / aA + r2;
        p3 = mA * (p3 - r3) / aA + r3;
    } else {
        pA = 0;
        p1 = 0;
        p2 = 0;
        p3 = 0;
    }
}
