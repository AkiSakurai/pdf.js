/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { renderAndReturnImagedata } from "./worker_spec.common.js";

describe("worker", function () {
  it("should render in worker ", async function () {
    const worker = new Worker("./worker_spec.worker.js");
    const workerImageDataPromise = new Promise((resolve, reject) => {
      worker.onmessage = imageData => {
        resolve(imageData);
      };
      worker.onerror = reject;
    });
    worker.postMessage({});
    const imageData = await renderAndReturnImagedata();
    const workerImageData = (await workerImageDataPromise).data;
    expect(
      imageData.data.every((p, i) => p === workerImageData.data[i])
    ).toEqual(true);
  });
});
