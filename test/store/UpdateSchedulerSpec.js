const chai = require('chai')
const {capture, wait} = require('../testutil/Helpers')
const {UpdateScheduler} = require('../../main')

const should = chai.should();

describe("Update scheduler", function () {
    this.timeout(1000);

    it("when created and no activity requires updates at interval until timeout then stops", function () {
        const scheduler = new UpdateScheduler(0.05, 0.18)
        const updateRequireds = capture(scheduler.updateRequired)

        return wait(300).then( () => updateRequireds.length.should.eql(3))
    })

    it("when created and gets ui activity requires updates at interval until timeout after last activity", function () {
        const scheduler = new UpdateScheduler(0.05, 0.18)
        const updateRequireds = capture(scheduler.updateRequired)

        wait(100).then(() => scheduler.uiEventReceived())
        wait(200).then(() => scheduler.uiEventReceived())
        return wait(420).then( () => updateRequireds.length.should.be.at.least(6).and.at.most(7) )
    })

    it("when times out checks immediately when ui activity", function () {
        const scheduler = new UpdateScheduler(0.05, 0.130)
        const updateRequireds = capture(scheduler.updateRequired)

        wait(200).then(() => scheduler.uiEventReceived())
        return wait(220).then( () => updateRequireds.length.should.be.eql(3) )
    })

    it("when window goes to not in use stops checks immediately", function () {
        const scheduler = new UpdateScheduler(0.05, 1.0)
        const updateRequireds = capture(scheduler.updateRequired)

        wait(130).then(() => scheduler.windowInUse(false))
        return wait(220).then( () => updateRequireds.length.should.be.eql(2) )
    })

    it("when window goes to in use starts checks immediately", function () {
        const scheduler = new UpdateScheduler(0.05, 1.0)
        const updateRequireds = capture(scheduler.updateRequired)

        scheduler.windowInUse(false)

        wait(100).then(() => scheduler.windowInUse(true))
        return wait(230).then( () => updateRequireds.length.should.be.eql(3) )
    })



})
