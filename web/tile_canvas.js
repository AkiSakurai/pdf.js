import { clamp, roundToDivide } from "./ui_utils.js";
import { Util } from "../src/shared/util.js";

class TileRenderTask {
  constructor(pdfPage, renderContext, tiles) {
    this.onContinue = null;
    const self = this;

    this.promise = new Promise((resolve, reject) => {
      const remainingTiles = [...tiles];

      function getIntersectionArea(element) {
        const bound = element.getBoundingClientRect();

        const x = clamp(bound.x, 0, window.innerWidth);
        const y = clamp(bound.y, 0, window.innerHeight);

        const x1 = clamp(bound.x + bound.width, 0, window.innerWidth);
        const y1 = clamp(bound.y + bound.height, 0, window.innerHeight);

        return (x1 - x) * (y1 - y);
      }

      function popHighestPriorityTile() {
        let maxTile;
        let maxIntersectArea = 0;
        for (const tile of remainingTiles) {
          const intersectArea = getIntersectionArea(tile.canvas);
          if (intersectArea >= maxIntersectArea) {
            maxTile = tile;
            maxIntersectArea = intersectArea;
          }
        }
        remainingTiles.splice(remainingTiles.indexOf(maxTile), 1);
        return maxTile;
      }

      async function runRemainTasks() {
        if (remainingTiles.length === 0) {
          resolve();
        } else {
          const tile = popHighestPriorityTile();
          const canvasContext = tile.canvas.getContext("2d", { alpha: false });

          const translate = [1, 0, 0, 1, -tile.x, -tile.y];
          const transform = renderContext.transform
            ? Util.transform(translate, renderContext.transform)
            : translate;

          const renderTask = pdfPage.render({
            ...renderContext,
            canvasContext,
            transform,
          });

          self.cancel = delay => {
            renderTask.cancel(delay);
            remainingTiles.splice(0);
          };

          renderTask.onContinue = self.onContinue;
          renderTask.promise.then(() => {
            if (!self.separateAnnots) {
              self.separateAnnots = renderTask.separateAnnots;
            }
            runRemainTasks(remainingTiles, resolve, reject);
          }, reject);
        }
      }
      this.cancel = () => remainingTiles.splice(0);
      runRemainTasks(remainingTiles, resolve, reject);
    });
  }
}

class TileLayer {
  constructor(width, height, maxCanvasSize, sfx, sfy) {
    const styleWidth = (width / sfx[0]) * sfx[1];
    const styleHeight = (height / sfy[0]) * sfy[1];

    const element = (this.element = document.createElement("div"));
    element.className = "tileLayer";
    const tiles = [];
    function createTiles(x, y, tileWidth, tileHeight) {
      if (tileWidth * tileHeight < maxCanvasSize) {
        const canvas = document.createElement("canvas");
        canvas.width = tileWidth;
        canvas.height = tileHeight;
        canvas.style.position = "absolute";
        canvas.style.left = `calc(100% * ${
          (x / sfx[0]) * sfx[1]
        } / ${styleWidth} )`;
        canvas.style.top = `calc(100% * ${
          (y / sfy[0]) * sfy[1]
        }/ ${styleHeight} )`;
        canvas.style.width = `calc(100%  * ${
          (tileWidth / sfx[0]) * sfx[1]
        } / ${styleWidth})`;
        canvas.style.height = `calc(100%  * ${
          (tileHeight / sfy[0]) * sfy[1]
        }/ ${styleHeight} )`;

        element.append(canvas);
        tiles.push({
          canvas,
          x,
          y,
        });
      } else if (tileWidth >= tileHeight) {
        const halfWidth = roundToDivide(tileWidth / 2, sfx[0]);
        createTiles(x, y, halfWidth, tileHeight);
        createTiles(x + halfWidth, y, tileWidth - halfWidth, tileHeight);
      } else {
        const halfHeight = roundToDivide(tileHeight / 2, sfy[0]);
        createTiles(x, y, tileWidth, halfHeight);
        createTiles(x, y + halfHeight, tileWidth, tileHeight - halfHeight);
      }
    }
    createTiles(0, 0, width, height);
    this.tiles = tiles;
  }

  setAttribute(name, value) {
    this.tiles.forEach(tile => tile.canvas.setAttribute(name, value));
  }

  get hidden() {
    return this.element.style.hidden;
  }

  set hidden(isHidden) {
    this.element.style.hidden = isHidden;
  }

  clear() {
    this.tiles.forEach(tile => {
      tile.canvas.width = 0;
      tile.canvas.height = 0;
    });
  }

  render(pdfPage, renderContext) {
    return new TileRenderTask(pdfPage, renderContext, this.tiles);
  }
}

export { TileLayer };
