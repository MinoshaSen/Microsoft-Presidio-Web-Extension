import spacy
import random
from spacy.training.example import Example
from training_data import TRAIN_DATA

def train_spacy_ner_model():
    nlp = spacy.blank("en")
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner", last=True)
    else:
        ner = nlp.get_pipe("ner")

    for _, annotations in TRAIN_DATA:
        for ent in annotations.get("entities"):
            ner.add_label(ent[2])

    optimizer = nlp.begin_training()
    for itn in range(20):
        print(f"Starting iteration {itn + 1}")
        random.shuffle(TRAIN_DATA)
        losses = {}
        for text, annotations in TRAIN_DATA:
            doc = nlp.make_doc(text)
            example = Example.from_dict(doc, annotations)
            nlp.update([example], drop=0.35, sgd=optimizer, losses=losses)
        print("Losses:", losses)

    output_dir = "./custom-spacy-model"
    nlp.to_disk(output_dir)
    print(f" Model saved to '{output_dir}'")

if __name__ == "__main__":
    train_spacy_ner_model()