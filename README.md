# digit-classifier

## Model info
Model trained on [dataset](https://www.kaggle.com/datasets/olafkrastovski/handwritten-digits-0-9) by ANDRÉ MEIER
Neutral network train using neutral network which contains:
  - **1st Hidden layer** with 128 neurons
  - **2nd Hidden layer** with 64 neurons
  - **3rd Hidden layer** with 128 neurons
  - **Output layer** with 10 neurons
All hidden layers are using relu activation function and output layer uses softmax with Spare Categorical Crossentropy loss function and adam optimizer function
