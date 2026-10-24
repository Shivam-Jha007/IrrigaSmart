"""Export the Final_Model PyTorch checkpoint for IrrigaSmart's offline web app.

The production UI runs inference in the browser with ONNX Runtime Web, while
the source checkpoint is a PyTorch MobileNetV3-Large checkpoint.  This script
keeps the conversion reproducible and exports both the diagnosis logits and
the normalized feature embedding used by the selective rice-leaf gate.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models


class ExportableRiceModel(nn.Module):
    def __init__(self, model: nn.Module) -> None:
        super().__init__()
        self.features = model.features
        self.avgpool = model.avgpool
        self.classifier = model.classifier

    def forward(self, image: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        feature_map = self.features(image)
        pooled = self.avgpool(feature_map).flatten(1)
        logits = self.classifier(pooled)
        normalized_features = torch.nn.functional.normalize(pooled, dim=1)
        return logits, normalized_features


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--gate", type=Path, required=True)
    parser.add_argument("--onnx", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--gate-json", type=Path, required=True)
    args = parser.parse_args()

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    classes = list(checkpoint["classes"])
    model = models.mobilenet_v3_large(weights=None)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(classes))
    model.load_state_dict(checkpoint["model_state"])
    model.eval()

    export_model = ExportableRiceModel(model).eval()
    sample = torch.zeros(1, 3, 224, 224, dtype=torch.float32)
    args.onnx.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        export_model,
        sample,
        args.onnx,
        input_names=["image"],
        output_names=["logits", "features"],
        opset_version=17,
        dynamo=False,
        do_constant_folding=True,
    )

    gate = torch.load(args.gate, map_location="cpu", weights_only=False)
    if list(gate["classes"]) != classes:
        raise ValueError("The gate classes do not match the diagnosis checkpoint.")
    gate_payload = {
        "classes": classes,
        "centroids": gate["centroids"].tolist(),
        "similarityThreshold": float(gate["similarity_threshold"]),
    }
    args.gate_json.write_text(json.dumps(gate_payload, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "architecture": "mobilenet_v3_large",
        "framework": "pytorch-exported-to-onnx",
        "imageSize": 224,
        "normalisation": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        },
        "outputs": {"logits": "logits", "features": "features"},
        "classes": classes,
        "diagnosisConfidenceThreshold": 0.75,
        "gateSimilarityThreshold": float(gate["similarity_threshold"]),
    }
    args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"exported={args.onnx}")
    print(f"manifest={args.manifest}")
    print(f"gate={args.gate_json}")
    print(f"classes={classes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
