---
title: "Multispectral imaging in surgery"
period: "2016 to 2020"
place: "German Cancer Research Center, Heidelberg"
summary: "Measuring how well tissue is supplied with oxygen and blood during surgery from multispectral images, without a contrast dye."
order: 2
papers:
  - title: "Spectral imaging enables contrast agent-free real-time ischemia monitoring in laparoscopic surgery"
    url: "https://doi.org/10.1126/sciadv.add6778"
  - title: "Band selection for oxygenation estimation with multispectral/hyperspectral imaging"
    url: "https://doi.org/10.1364/BOE.441214"
  - title: "Video-rate multispectral imaging in laparoscopic surgery: first-in-human application"
    url: "https://arxiv.org/abs/2105.13901"
  - title: "Light source calibration for multispectral imaging in surgery"
    url: "https://doi.org/10.1007/s11548-020-02195-y"
  - title: "Uncertainty-aware performance assessment of optical imaging modalities with invertible neural networks"
    url: "https://doi.org/10.1007/s11548-019-01939-9"
  - title: "Live monitoring of haemodynamic changes with multispectral image analysis"
    url: "https://doi.org/10.1007/978-3-030-32695-1_5"
  - title: "Uncertainty handling in intra-operative multispectral imaging with invertible neural networks"
  - title: "Hyperspectral camera selection for interventional health-care"
    url: "https://arxiv.org/abs/1904.02709"
  - title: "Domain and task specific multispectral band selection"
    url: "https://doi.org/10.1117/12.2287824"
  - title: "Physiological parameter estimation from multispectral images unleashed"
    url: "https://doi.org/10.1007/978-3-319-66179-7_16"
---

## The problem

No measured reference exists for the oxygenation and the blood volume of living tissue. A machine-learning model therefore cannot simply be trained on measured examples.

In partial nephrectomy, the surgeon clamps the arteries that supply the kidney and can confirm the clamp by injecting indocyanine green (ICG), a dye that fluoresces under near-infrared light. Because the dye stays in the tissue, it limits how quickly and how often that check can be repeated.

## What was done

I led the development of a hyperspectral imaging and deep-learning platform for identifying anastomotic leakage in colorectal procedures. I carried it from concept through pre-clinical validation to a first-in-human application in partial nephrectomy.

To give the machine-learning models something to learn from, I developed a generalised tissue model from multi-layered Monte Carlo simulation and biophysical tissue parameters, and trained the models on it. I validated the approach on animal data from different organs.

In the first-in-human work, a compact multispectral camera replaced the dye and measured the kidney's oxygen saturation and blood volume at video rate. The surgeon could confirm that perfusion had stopped, clamp a further vessel if it had not, and check again without losing significant time or adding risk for the patient. The work was published in Science Advances in 2023.

I also created a simulation framework that compares multispectral set-ups, so that a cost-effective camera can be chosen without building physical prototypes.
