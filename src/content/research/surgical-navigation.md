---
title: "Surgical navigation and biopsy-site relocalisation"
period: "2009 to 2016"
place: "IRCAD in Strasbourg and Taiwan"
summary: "Finding a biopsy site again at a follow-up examination, and guiding laparoscopic surgery with tracking and augmented reality."
order: 1
papers:
  - title: "Augmented reality navigation systems in endoscopy"
    url: "https://doi.org/10.3389/fgstr.2024.1345466"
  - title: "Interoperative biopsy site relocalization in endoluminal surgery"
    url: "https://doi.org/10.1109/TBME.2015.2503981"
  - title: "An application of robot arm for dynamic field of view expansion during laparoscopy"
    url: "https://doi.org/10.1007/978-4-431-55810-1_9"
  - title: "Automatic view-point selection for inter-operative endoscopic surveillance"
    url: "https://arxiv.org/abs/1610.04097"
  - title: "Video synchronization: an approach to biopsy site re-localization"
  - title: "Development of a prototype of video synchronisation for relocalization of biopsy sites during endoscopic evaluation of Barrett's oesophagus"
  - title: "Développement d'un système de relocalisation endoscopique de sites de biopsie dans le suivi de l'endobrachyoesophage : résultats préliminaires d'un prototype de synchronisation vidéo"
    lang: fr
    translation: "Development of an endoscopic biopsy-site relocalisation system for Barrett's oesophagus surveillance: preliminary results of a video-synchronisation prototype"
  - title: "Inter-operative trajectory registration for endoluminal video synchronization: application to biopsy site re-localization"
    url: "https://doi.org/10.1007/978-3-642-40811-3_47"
  - title: "Hybrid optical and electromagnetic method for medical instrument tracking application"
    url: "https://doi.org/10.1109/ISCE.2013.6570201"
  - title: "A landmark based registration technique for minimally invasive spinal surgery"
    url: "https://doi.org/10.1109/ISCE.2013.6570203"
  - title: "Deformable three-dimensional model architecture for interactive augmented reality in minimally invasive surgery"
    url: "https://doi.org/10.1007/s00464-012-2395-0"
  - title: "Endoscopic video mosaicing: application to surgery and diagnostics"
---

## The problem

A patient under surveillance for Barrett's oesophagus is examined repeatedly. At each follow-up the clinician has to find a biopsy site or lesion from the earlier examination again, so that treatment can be targeted.

In laparoscopic surgery, the questions were how to guide the surgeon with augmented reality built from the patient's pre-operative CT images, and how to widen the view that the camera gives.

## What was done

At IHU and IRCAD in Strasbourg I designed a relocalisation system for gastrointestinal endoscopy. During the first examination, electromagnetic tracking recorded the positions of the patient and the endoscope, with the image at each position. At the follow-up, these positions gave a rough relocalisation, and matching of the local image then found the exact earlier view. In pre-clinical trials, the accuracy of retargeting a biopsy site rose from 48% to 94%, and recall from 63% to 97%.

The system went from concept through a working prototype to bench testing and animal studies. The clinical evaluation was carried out with gastroenterologists in Barrett's oesophagus surveillance, and the resulting study was co-authored with them.

At IRCAD Taiwan I combined marker-based tracking with tool tracking in laparoscopic video, to provide augmented-reality guidance based on pre-operatively segmented CT images. I also developed the core technology of a robot-arm system that widens the laparoscopic view.
