import { readFileSync } from "node:fs";
import cv, { Mat } from "@u4/opencv4nodejs";

export interface ImageNameToPath {
  [name: string]: {
    path: string;
    croppedX: number;
    croppedY: number;
    croppedWidth: number;
    croppedHeight: number;
    matchThreshold: number;
    cvImage?: Mat;
  };
}

export class FrameMatcher {
  private images: ImageNameToPath;
  constructor(nameToImagePath: ImageNameToPath) {
    this.images = nameToImagePath;
    for (const def of Object.values(nameToImagePath)) {
      def.cvImage = cv.imdecode(readFileSync(def.path));
    }
  }

  async checkBufferForMatch(buf: Buffer): Promise<string> {
    const mat = cv.imdecode(buf);

    const scores = Object.entries(this.images).map(async ([name, image]) => {
      if (!image.cvImage) {
        throw new Error(
          `[FrameMatcher] image ${name} was not loaded or failed to load`,
        );
      }

      const cropped = mat.getRegion(
        new cv.Rect(
          image.croppedX,
          image.croppedY,
          image.croppedWidth,
          image.croppedHeight,
        ),
      );

      const res = await cropped.matchTemplateAsync(
        image.cvImage,
        cv.TM_CCOEFF_NORMED,
      );

      const score = res.minMaxLoc().maxVal;
      return { name, score, threshold: image.matchThreshold };
    });

    const resolvedScores = await Promise.all(scores);

    let currMax = { name: "NONE", score: 0 };
    for (const score of resolvedScores) {
      if (score.score >= score.threshold && currMax.score < score.score)
        currMax = score;
    }

    return currMax.name;
  }
}
