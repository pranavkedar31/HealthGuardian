"""
Disease Risk Predictor — Multi-Model ML Comparison & Selection System.
Evaluates both Logistic Regression and Random Forest using validation metrics
(Accuracy, Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix).
Selects the best performing validated model based on clinical metric optimization.
"""
from dataclasses import dataclass
from typing import Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

_RNG = np.random.default_rng(42)


def _synthesize_dataset(n: int, risk_fn) -> tuple[np.ndarray, np.ndarray]:
    ages = _RNG.uniform(18, 85, n)
    bmis = _RNG.uniform(16, 45, n)
    systolic = _RNG.uniform(90, 190, n)
    sugar = _RNG.uniform(70, 260, n)
    smoking = _RNG.integers(0, 2, n)
    alcohol = _RNG.integers(0, 2, n)

    X = np.column_stack([ages, bmis, systolic, sugar, smoking, alcohol])
    y = np.array(
        [risk_fn(a, b, s, sg, sm, al) for a, b, s, sg, sm, al in zip(ages, bmis, systolic, sugar, smoking, alcohol)]
    )
    return X, y


def _diabetes_risk_label(age, bmi, systolic, sugar, smoking, alcohol) -> int:
    score = 0.03 * age + 0.15 * bmi + 0.04 * sugar - 8
    return 1 if score + _RNG.normal(0, 3) > 0 else 0


def _heart_risk_label(age, bmi, systolic, sugar, smoking, alcohol) -> int:
    score = 0.04 * age + 0.08 * bmi + 0.05 * systolic + 2.0 * smoking + 1.0 * alcohol - 12
    return 1 if score + _RNG.normal(0, 3) > 0 else 0


def _hypertension_risk_label(age, bmi, systolic, sugar, smoking, alcohol) -> int:
    score = 0.05 * age + 0.10 * bmi + 0.08 * systolic - 14
    return 1 if score + _RNG.normal(0, 3) > 0 else 0


@dataclass
class ModelMetrics:
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: list[list[int]]
    selected: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "accuracy": round(self.accuracy, 4),
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1_score": round(self.f1_score, 4),
            "roc_auc": round(self.roc_auc, 4),
            "confusion_matrix": self.confusion_matrix,
            "selected": self.selected,
        }


class RiskPredictor:
    TASKS = {
        "diabetes": _diabetes_risk_label,
        "heart_disease": _heart_risk_label,
        "hypertension": _hypertension_risk_label,
    }

    def __init__(self):
        self.models: dict[str, dict[str, Any]] = {}
        self.metrics: dict[str, list[ModelMetrics]] = {}
        self.best_models: dict[str, str] = {}
        self._train_and_evaluate_all()

    def _train_and_evaluate_all(self):
        """
        Trains and validates both Logistic Regression and Random Forest
        for each disease risk task. Compares metrics and selects best model.
        """
        for task_name, risk_fn in self.TASKS.items():
            X, y = _synthesize_dataset(800, risk_fn)
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.25, random_state=42, stratify=y
            )

            # 1. Candidate Model A: Logistic Regression
            lr = LogisticRegression(max_iter=1000, random_state=42)
            lr.fit(X_train, y_train)
            lr_pred = lr.predict(X_val)
            lr_prob = lr.predict_proba(X_val)[:, 1]

            lr_metrics = ModelMetrics(
                model_name="Logistic Regression",
                accuracy=float(accuracy_score(y_val, lr_pred)),
                precision=float(precision_score(y_val, lr_pred, zero_division=0)),
                recall=float(recall_score(y_val, lr_pred, zero_division=0)),
                f1_score=float(f1_score(y_val, lr_pred, zero_division=0)),
                roc_auc=float(roc_auc_score(y_val, lr_prob)),
                confusion_matrix=confusion_matrix(y_val, lr_pred).tolist(),
            )

            # 2. Candidate Model B: Random Forest Classifier
            rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
            rf.fit(X_train, y_train)
            rf_pred = rf.predict(X_val)
            rf_prob = rf.predict_proba(X_val)[:, 1]

            rf_metrics = ModelMetrics(
                model_name="Random Forest",
                accuracy=float(accuracy_score(y_val, rf_pred)),
                precision=float(precision_score(y_val, rf_pred, zero_division=0)),
                recall=float(recall_score(y_val, rf_pred, zero_division=0)),
                f1_score=float(f1_score(y_val, rf_pred, zero_division=0)),
                roc_auc=float(roc_auc_score(y_val, rf_prob)),
                confusion_matrix=confusion_matrix(y_val, rf_pred).tolist(),
            )

            # Clinical Selection Metric: Balance of Recall and F1-score to minimize false negatives
            lr_score = (lr_metrics.recall * 0.5) + (lr_metrics.f1_score * 0.5)
            rf_score = (rf_metrics.recall * 0.5) + (rf_metrics.f1_score * 0.5)

            if rf_score >= lr_score:
                rf_metrics.selected = True
                selected_name = "Random Forest"
            else:
                lr_metrics.selected = True
                selected_name = "Logistic Regression"

            self.models[task_name] = {
                "Logistic Regression": lr,
                "Random Forest": rf,
            }
            self.metrics[task_name] = [lr_metrics, rf_metrics]
            self.best_models[task_name] = selected_name

    def get_comparison_table(self) -> dict[str, list[dict[str, Any]]]:
        """Returns comparison metrics for Doctor/Admin dashboards."""
        return {
            task: [m.to_dict() for m in metrics_list]
            for task, metrics_list in self.metrics.items()
        }

    def predict(
        self,
        age: float,
        bmi: float,
        blood_pressure_systolic: float,
        blood_sugar: float,
        smoking: bool,
        alcohol: bool,
    ) -> dict[str, Any]:
        """
        Runs prediction using the best validated model for each task.
        Also records alternative model prediction for transparency.
        """
        features = np.array([[age, bmi, blood_pressure_systolic, blood_sugar, int(smoking), int(alcohol)]])

        results = {}
        for task_name in self.TASKS:
            best_name = self.best_models[task_name]
            best_model = self.models[task_name][best_name]
            prob = float(round(best_model.predict_proba(features)[0][1] * 100, 2))
            results[f"{task_name}_risk"] = prob
            results[f"{task_name}_model"] = best_name

        avg_risk = (
            results["diabetes_risk"]
            + results["heart_disease_risk"]
            + results["hypertension_risk"]
        ) / 3

        if avg_risk < 25:
            risk_level = "low"
        elif avg_risk < 55:
            risk_level = "moderate"
        else:
            risk_level = "high"

        return {
            "diabetes_risk": results["diabetes_risk"],
            "heart_disease_risk": results["heart_disease_risk"],
            "hypertension_risk": results["hypertension_risk"],
            "risk_level": risk_level,
            "models_used": {task: self.best_models[task] for task in self.TASKS},
            "comparison_metrics": self.get_comparison_table(),
        }


_predictor_instance: Optional[RiskPredictor] = None


def get_risk_predictor() -> RiskPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = RiskPredictor()
    return _predictor_instance
