import random
import pprint

NUM_EXAMPLES = 500
OUTPUT_FILE = "training_data.py"

PERSONS = [
    "Kamal Perera", "Ruwan", "Anusha Silva", "Sunil Fernando", "Gayan Bandara",
    "Arun Kumar", "Priya Subramaniam", "Nimal", "Chamara", "Deepika", "Suresh Pillai",
    "Mahinda Rajapaksa", "Lasantha", "Niluka", "Karthik", "Geetha", "Mahela Jayawardena"
]
LOCATIONS = [
    "Colombo", "Kandy", "Galle", "Jaffna", "Matara", "Nuwara Eliya", "Anuradhapura",
    "Trincomalee", "Dehiwala-Mount Lavinia", "Moratuwa", "Negombo", "Ratnapura"
]
JOB_TITLES = ["CEO", "Manager", "Engineer", "Director", "Supervisor"]

def generate_nic():
    if random.choice([True, False]):
        return f"{random.randint(100000000, 999999999)}V"
    else:
        return f"{random.randint(1900, 2023)}{random.randint(10000000, 99999999)}"

def generate_phone():
    return f"+947{random.randint(10000000, 99999999)}"

templates = [
    ("My name is {PERSON} and I live in {LOCATION}.", ["PERSON", "LOCATION"]),
    ("Please contact {PERSON} on his number {SL_PHONE_NUMBER}.", ["PERSON", "SL_PHONE_NUMBER"]),
    ("Her NIC is {SL_NIC} and she is a {JOB_TITLE}.", ["SL_NIC", "JOB_TITLE"]),
    ("The report was sent by an {JOB_TITLE} from {LOCATION}.", ["JOB_TITLE", "LOCATION"]),
    ("I saw {PERSON} yesterday.", ["PERSON"]),
    ("The main office is located in {LOCATION}.", ["LOCATION"]),
    ("{PERSON}'s ID number is {SL_NIC}.", ["PERSON", "SL_NIC"]),
    ("You can reach the {JOB_TITLE} at {SL_PHONE_NUMBER}.", ["JOB_TITLE", "SL_PHONE_NUMBER"]),
    ("There are no sensitive details in this message.", []),
    ("Please review the attached quarterly report.", []),
]

def generate_training_data(num_examples):
    train_data = []
    for _ in range(num_examples):
        template, entity_labels = random.choice(templates)
        if not entity_labels:
            train_data.append((template, {"entities": []}))
            continue
        sentence = template
        entities = []
        replacements = {}
        if "PERSON" in entity_labels: replacements["PERSON"] = random.choice(PERSONS)
        if "LOCATION" in entity_labels: replacements["LOCATION"] = random.choice(LOCATIONS)
        if "JOB_TITLE" in entity_labels: replacements["JOB_TITLE"] = random.choice(JOB_TITLES)
        if "SL_NIC" in entity_labels: replacements["SL_NIC"] = generate_nic()
        if "SL_PHONE_NUMBER" in entity_labels: replacements["SL_PHONE_NUMBER"] = generate_phone()
        
        processed_sentence = sentence
        offset = 0
        for label, value in sorted(replacements.items(), key=lambda item: sentence.find(f"{{{item[0]}}}")):
            placeholder = f"{{{label}}}"
            start_index_in_template = sentence.find(placeholder)
            start_index_in_processed = start_index_in_template + offset
            end_index_in_processed = start_index_in_processed + len(value)
            entities.append((start_index_in_processed, end_index_in_processed, label))
            processed_sentence = processed_sentence.replace(placeholder, value, 1)
            offset += len(value) - len(placeholder)
        train_data.append((processed_sentence, {"entities": sorted(entities, key=lambda x: x[0])}))
    return train_data

if __name__ == "__main__":
    print(f"Generating {NUM_EXAMPLES} training examples...")
    generated_data = generate_training_data(NUM_EXAMPLES)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# Auto-generated training data for spaCy NER model\n\n")
        f.write("TRAIN_DATA = ")
        f.write(pprint.pformat(generated_data))
    print(f" Successfully generated and saved data to '{OUTPUT_FILE}'")