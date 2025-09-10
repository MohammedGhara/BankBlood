const Joi = require('joi');

const CreateDonationDTO = Joi.object({
  donorId:   Joi.string().required(),
  donorName: Joi.string().required(),
  bloodType: Joi.string()
    .valid('A+','A-','B+','B-','AB+','AB-','O+','O-')
    .required(),
  donatedAt: Joi.date().iso().required(),
});

function DonationResponseDTO(d) {
  return {
    id: d.id,
    donorId: d.donorId,
    donorName: d.donorName,
    bloodType: d.bloodType,
    donatedAt: d.donatedAt,
  };
}

module.exports = { CreateDonationDTO, DonationResponseDTO };
