interface DqnBatchSample {
  readonly input: readonly number[];
  readonly actionIndex: number;
  readonly targetValue: number;
}

interface DenseLayer {
  readonly inputSize: number;
  readonly outputSize: number;
  readonly weights: Float64Array;
  readonly biases: Float64Array;
  readonly mWeights: Float64Array;
  readonly vWeights: Float64Array;
  readonly mBiases: Float64Array;
  readonly vBiases: Float64Array;
}

interface ForwardPass {
  readonly activations: Float64Array[];
}

export interface ObjectiveDqnConfig {
  readonly inputSize: number;
  readonly outputSize: number;
  readonly hiddenLayers: readonly number[];
  readonly learningRate: number;
  readonly random: () => number;
  readonly syncEveryUpdates?: number;
}

function createDenseLayer(
  inputSize: number,
  outputSize: number,
  random: () => number,
): DenseLayer {
  const limit = Math.sqrt(6 / Math.max(1, inputSize + outputSize));
  const weights = new Float64Array(inputSize * outputSize);
  for (let index = 0; index < weights.length; index += 1) {
    weights[index] = (random() * 2 - 1) * limit;
  }

  return {
    inputSize,
    outputSize,
    weights,
    biases: new Float64Array(outputSize),
    mWeights: new Float64Array(weights.length),
    vWeights: new Float64Array(weights.length),
    mBiases: new Float64Array(outputSize),
    vBiases: new Float64Array(outputSize),
  };
}

function weightIndex(layer: DenseLayer, outputIndex: number, inputIndex: number): number {
  return outputIndex * layer.inputSize + inputIndex;
}

class MlpNetwork {
  private readonly layers: DenseLayer[];
  private readonly learningRate: number;
  private optimizationStep = 0;

  constructor(config: ObjectiveDqnConfig) {
    const layerSizes = [config.inputSize, ...config.hiddenLayers, config.outputSize];
    this.layers = [];
    for (let index = 0; index < layerSizes.length - 1; index += 1) {
      this.layers.push(createDenseLayer(layerSizes[index], layerSizes[index + 1], config.random));
    }
    this.learningRate = config.learningRate;
  }

  public copyFrom(source: MlpNetwork): void {
    source.layers.forEach((sourceLayer, layerIndex) => {
      this.layers[layerIndex].weights.set(sourceLayer.weights);
      this.layers[layerIndex].biases.set(sourceLayer.biases);
    });
  }

  public predict(input: readonly number[]): number[] {
    const activations = this.forward(input).activations;
    return Array.from(activations[activations.length - 1] ?? []);
  }

  public trainBatch(samples: readonly DqnBatchSample[]): number {
    if (samples.length === 0) {
      return 0;
    }

    const gradWeights = this.layers.map((layer) => new Float64Array(layer.weights.length));
    const gradBiases = this.layers.map((layer) => new Float64Array(layer.biases.length));
    let lossSum = 0;

    for (const sample of samples) {
      const forwardPass = this.forward(sample.input);
      const activations = forwardPass.activations;
      const output = activations[activations.length - 1];
      const deltaOutputs = new Float64Array(output.length);
      const prediction = output[sample.actionIndex] ?? 0;
      const error = prediction - sample.targetValue;
      lossSum += error * error;
      if (sample.actionIndex >= 0 && sample.actionIndex < deltaOutputs.length) {
        deltaOutputs[sample.actionIndex] = 2 * error;
      }

      let nextDelta = deltaOutputs;
      for (let layerIndex = this.layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
        const layer = this.layers[layerIndex];
        const inputActivation = activations[layerIndex];
        const outputActivation = activations[layerIndex + 1];
        const currentDelta = new Float64Array(layer.outputSize);

        if (layerIndex === this.layers.length - 1) {
          currentDelta.set(nextDelta);
        } else {
          const nextLayer = this.layers[layerIndex + 1];
          for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
            let backprop = 0;
            for (let nextOutputIndex = 0; nextOutputIndex < nextLayer.outputSize; nextOutputIndex += 1) {
              backprop +=
                nextLayer.weights[weightIndex(nextLayer, nextOutputIndex, outputIndex)] *
                nextDelta[nextOutputIndex];
            }
            const tanhActivation = outputActivation[outputIndex];
            currentDelta[outputIndex] = backprop * (1 - tanhActivation * tanhActivation);
          }
        }

        for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
          gradBiases[layerIndex][outputIndex] += currentDelta[outputIndex];
          for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
            gradWeights[layerIndex][weightIndex(layer, outputIndex, inputIndex)] +=
              currentDelta[outputIndex] * inputActivation[inputIndex];
          }
        }

        nextDelta = currentDelta;
      }
    }

    this.optimizationStep += 1;
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex += 1) {
      const layer = this.layers[layerIndex];
      this.applyAdamUpdate(
        layer.weights,
        gradWeights[layerIndex],
        layer.mWeights,
        layer.vWeights,
        samples.length,
      );
      this.applyAdamUpdate(
        layer.biases,
        gradBiases[layerIndex],
        layer.mBiases,
        layer.vBiases,
        samples.length,
      );
    }

    return lossSum / samples.length;
  }

  private forward(input: readonly number[]): ForwardPass {
    const activations: Float64Array[] = [Float64Array.from(input)];

    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex += 1) {
      const layer = this.layers[layerIndex];
      const previous = activations[layerIndex];
      const current = new Float64Array(layer.outputSize);
      const isOutputLayer = layerIndex === this.layers.length - 1;

      for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
        let value = layer.biases[outputIndex];
        for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
          value +=
            layer.weights[weightIndex(layer, outputIndex, inputIndex)] * previous[inputIndex];
        }
        current[outputIndex] = isOutputLayer ? value : Math.tanh(value);
      }

      activations.push(current);
    }

    return { activations };
  }

  private applyAdamUpdate(
    params: Float64Array,
    grads: Float64Array,
    firstMoment: Float64Array,
    secondMoment: Float64Array,
    batchSize: number,
  ): void {
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;
    const biasCorrection1 = 1 - Math.pow(beta1, this.optimizationStep);
    const biasCorrection2 = 1 - Math.pow(beta2, this.optimizationStep);

    for (let index = 0; index < params.length; index += 1) {
      const grad = grads[index] / batchSize;
      firstMoment[index] = beta1 * firstMoment[index] + (1 - beta1) * grad;
      secondMoment[index] = beta2 * secondMoment[index] + (1 - beta2) * grad * grad;

      const mHat = firstMoment[index] / biasCorrection1;
      const vHat = secondMoment[index] / biasCorrection2;
      params[index] -= this.learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
  }
}

export class ObjectiveDqn {
  private readonly online: MlpNetwork;
  private readonly target: MlpNetwork;
  private readonly syncEveryUpdates: number;
  private updateCount = 0;

  constructor(config: ObjectiveDqnConfig) {
    this.online = new MlpNetwork(config);
    this.target = new MlpNetwork(config);
    this.target.copyFrom(this.online);
    this.syncEveryUpdates = config.syncEveryUpdates ?? 25;
  }

  public predict(input: readonly number[]): number[] {
    return this.online.predict(input);
  }

  public predictTarget(input: readonly number[]): number[] {
    return this.target.predict(input);
  }

  public trainBatch(samples: readonly DqnBatchSample[]): number {
    const loss = this.online.trainBatch(samples);
    this.updateCount += 1;
    if (this.updateCount % this.syncEveryUpdates === 0) {
      this.target.copyFrom(this.online);
    }
    return loss;
  }
}
