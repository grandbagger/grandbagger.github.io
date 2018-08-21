import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Select from 'react-select'

import { useState, useEffect } from 'react'

import classifiersMetaJSON from './classifier.json'
import hhfsRaw from './hhfs.json'


const classifiers = classifiersMetaJSON.classifiers.map(({ id, classifier: code, name }) => ({
  id,
  label: code + ' ' + name,
  value: code,
  order: Number(
    code
      .replace('99-', '1999-')
      .replace('03-', '2003-')
      .replace('06-', '2006-')
      .replace('08-', '2008-')
      .replace('09-', '2009-')
      .replace('13-', '2013-')
      .replace('18-', '2018-')
      .replace('19-', '2019-')
      .replace('20-', '2020-')
      .replace('21-', '2021-')
      .replace('22-', '2021-')
      .replace('-', '')
  ),
})).sort(({order: a}, {order: b}) => a - b )
const classifiersIdMap = classifiers.reduce((acc, cur) => {
  const { id, value } = cur
  if (id === undefined) {
    debugger
  }
  return {...acc, [id]: value }
}, {})

const divisionsMap = {
  2: 'OPEN',
  3: 'LIMITED',
  4: 'LIMITED10',
  5: 'PRODUCTION',
  6: 'REVOLVER',
  7: 'SINGLESTACK',
  35: 'CARRYOPTICS',
  38: 'PCC',
}
const allDivisionsArray = Object.keys(divisionsMap).map(key => divisionsMap[key])

const hhfsProcessed = hhfsRaw.hhfs.reduce((acc, { division: divisionId, classifier: classifierId, hhf }) => {
  const classifier = classifiersIdMap[classifierId]
  const division = divisionsMap[Number(divisionId)]
  if (classifier === undefined) {
    // deleted classifier, data is still in hhfs, but not in classifier.json anymore
    return acc
  }

  const classifierBucket = acc[classifier] || {}
  return {...acc, [classifier]: {...classifierBucket, [division]: Number(hhf) }}
}, {})

const ClassifierSelect = ({ onSelect }) => (
  <Select
    className="ClassifierSelect p-1"
    options={classifiers}
    placeholder='Select a Classifier'
    onChange={({ value }) => onSelect?.(value)}
  />
)

const difficulty = (high, top10) => Number.parseInt(100*high/top10)

const DifficultyPillLabel = ({ label }) => (
  <span className={'DivisionCardDifficultyPill ' + label.toLowerCase()}>
    {label.toUpperCase()}
  </span>
)

const DifficultyPill = ({ difficulty }) => {
  if (!difficulty) {
    return null
  }

  if (difficulty >= 135) {
    return <DifficultyPillLabel label='impossible' />
  } else if (difficulty >= 120) {
    return <DifficultyPillLabel label='insane' />
  } else if (difficulty >= 110) {
    return <DifficultyPillLabel label='very-hard' />
  } else if (difficulty >= 102) {
    return <DifficultyPillLabel label='hard' />
  } else if (difficulty >= 94) {
    return <DifficultyPillLabel label='fair' />
  } else {
    return <DifficultyPillLabel label='easy' />
  }
}

const DivisionCard = ({ division, high, record, top10, onClick }) => (
  <Container className="DivisionCard" onClick={onClick}>
    <Row className="DivisionCardTitle">
      {division}
      {' '}
      <DifficultyPill difficulty={difficulty(high, top10)} />
      </Row>
    <Row>
      <Col className="DivisionCard-classInfo" title="Historical Record Hit-Factor">
        <span className="DivisionCard-class">
          R:
        </span>
        <span className="DivisionCard-classHF">
          {record && record.toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Average Top 10 Hit-Factor">
        <span className="DivisionCard-class">
          T:
        </span>
        <span className="DivisionCard-classHF">
          {top10 && top10.toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Difficulty Percentage (Official HHF / Top 10 HF)">
        <span className="DivisionCard-class">
          D:
        </span>
        <span className="DivisionCard-classHF">
          {top10 && high && (difficulty(high, top10) + '%')}
        </span>
      </Col>
    </Row>
    <Row>
      <Col className="DivisionCard-classInfo" title="Official Highest Hit-Factor (100%)">
        <span className="DivisionCard-class">
          H:
        </span>
        <span className="DivisionCard-classHF">
          {high && high.toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Official GrandMaster Hit-Factor (95%)">
        <span className="DivisionCard-class">
          G:
        </span>
        <span className="DivisionCard-classHF">
          {high && (high * 0.95).toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Official Master Hit-Factor (85%)">
        <span className="DivisionCard-class">
          M:
        </span>
        <span className="DivisionCard-classHF">
          {high && (high * 0.85).toFixed(2)}
        </span>
      </Col>
    </Row>
    <Row>
      <Col className="DivisionCard-classInfo" title="Official A-Class Hit-Factor (75%)">
        <span className="DivisionCard-class">
          A:
        </span>
        <span className="DivisionCard-classHF">
          {high && (high*0.75).toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Official B-Class Hit-Factor (60%)">
        <span className="DivisionCard-class">
          B:
        </span>
        <span className="DivisionCard-classHF">
          {high && (high*0.60).toFixed(2)}
        </span>
      </Col>
      <Col className="DivisionCard-classInfo" title="Official C-Class Hit-Factor (40%)">
        <span className="DivisionCard-class b">
          C:
        </span>
        <span className="DivisionCard-classHF">
          {high && (high*0.40).toFixed(2)}
        </span>
      </Col>
    </Row>
  </Container>
)

const calcTop10 = (data, division) => {
  const topWhat = 10 // playing with top10 vs top7 vs top5 for difficulty analysis
  const divisionData = data?.[division]
  if (!divisionData) {
    return undefined
  }

  const top10DivisionData = divisionData.slice(0, topWhat)
  const hfSum = top10DivisionData.reduce((acc, cur) => acc + cur.hit_factor, 0)
  return hfSum / topWhat
}

const calcRecord = (data, division) => {
  const divisionData = data?.[division]
  if (!divisionData) {
    return undefined
  }

  return divisionData[0].hit_factor
}

const HHFTable = ({ official, historical: h, onDivisionClick }) => (
  <Container className="HHFTable">
    <Row className="HHFTable-row">
      <DivisionCard
        division="Open"
        high={official?.OPEN}
        top10={calcTop10(h, 'OPEN')}
        record={calcRecord(h, 'OPEN')}
        onClick={() => onDivisionClick('OPEN')}
      />
      <DivisionCard
        division="Limited"
        high={official?.LIMITED}
        top10={calcTop10(h, 'LIMITED')}
        record={calcRecord(h, 'LIMITED')}
        onClick={() => onDivisionClick('LIMITED')}
      />
      <DivisionCard
        division="Carry Optics"
        high={official?.CARRYOPTICS}
        top10={calcTop10(h, 'CARRYOPTICS')}
        record={calcRecord(h, 'CARRYOPTICS')}
        onClick={() => onDivisionClick('CARRYOPTICS')}
      />
    </Row>
    <Row className="HHFTable-row">
      <DivisionCard
        division="Limited 10"
        high={official?.LIMITED10}
        top10={calcTop10(h, 'LIMITED10')}
        record={calcRecord(h, 'LIMITED10')}
        onClick={() => onDivisionClick('LIMITED10')}
      />
      <DivisionCard
        division="Production"
        high={official?.PRODUCTION}
        top10={calcTop10(h, 'PRODUCTION')}
        record={calcRecord(h, 'PRODUCTION')}
        onClick={() => onDivisionClick('PRODUCTION')}
      />
      <DivisionCard
        division="Single Stack"
        high={official?.SINGLESTACK}
        top10={calcTop10(h, 'SINGLESTACK')}
        record={calcRecord(h, 'SINGLESTACK')}
        onClick={() => onDivisionClick('SINGLESTACK')}
      />
    </Row>
    <Row className="HHFTable-row">
      <DivisionCard
        division="PCC"
        high={official?.PCC}
        top10={calcTop10(h, 'PCC')}
        record={calcTop10(h, 'PCC')}
        onClick={() => onDivisionClick('PCC')}
      />
      <DivisionCard
        division="Revolver"
        high={official?.REVOLVER}
        top10={calcTop10(h, 'REVOLVER')}
        record={calcRecord(h, 'REVOLVER')}
        onClick={() => onDivisionClick('REVOLVER')}
      />
    </Row>
  </Container>
)

const fetchPSDivision = async (stage, division) => {
  const result = await fetch('/data/' + stage + '/' + division.toUpperCase().replace(' ', '') + '/top100.json')
  const results = await result.json()
  return [division, results]
}

const fetchPS = async (stage) => {
  const fetchedTogether = await Promise.all(allDivisionsArray.map(division => fetchPSDivision(stage, division)))
  return Object.fromEntries(fetchedTogether)
}

// TODO: extract into utils file - dupep between api and front
const hitFactorSort = ({ hit_factor: a}, { hit_factor: b }) => {
	if (b > a) {
		return 1
	} else if (b < a) {
		return -1
	}
	return 0
}

const Top100Historical = ({ stage, division, psData, high, enteredHF }) => {
  if (!stage || !division) {
    return null
  }

  // TODO: insert HHF, TOP10 AVG

  const divisionData = psData?.[division]
  if (!divisionData) {
    return null
  }

  console.log(divisionData, null, 2)

  const insertions = [
    enteredHF && ({
      type: 'enteredHF',
      match_date: ' ',
      first_name: 'User',
      last_name: 'Input',
      member_number: ' ',
      classification: ' ',
      hit_factor: enteredHF,
    }),
  ].filter(Boolean)

  const rowStyle = e => e.type==='enteredHF' ? ({
    backgroundColor: 'rgba(36, 197, 36, 0.6)',
  }) : ({})

  return [...divisionData, ...insertions].sort(hitFactorSort).map((e, index) => (
    <Row className="DivisionCardTitle">
      <span style={{fontSize:12, ...rowStyle(e)}}>
        {e.type === 'enteredHF' ? '(*)' : index + 1}
        {' - '}
        {e.match_date}
        {' - '}
        {e.first_name + ' ' + e.last_name}
        {' - '}
        {e.member_number}
        {' - '}
        {'(' + e.classification + ')'}
        {' - '}
        {e.hit_factor}
        {' - '}
        {(100.0 * e.hit_factor / high).toFixed(2) + '%' }
      </span>
    </Row>
  ))
}

function App() {
  const [enteredHF, setEnteredHF] = useState()
  const [stage, setStage] = useState()
  const [psData, setPSData] = useState()
  const [selectedDivision, setSelectedDivision] = useState()

  useEffect(() => {
    setPSData()
    if (!stage) {
      return
    }

    fetchPS(stage).then(data => setPSData(data));

  }, [stage])
  //console.log(JSON.stringify(psData, null, 2))

  return (
    <div className="App">
		  <Container className="Controls">
        <Row>
          <ClassifierSelect onSelect={setStage} />
          <InputGroup className="mb-3 p-1 HitFactorInput">
            <InputGroup.Text id="basic-addon1">HF</InputGroup.Text>
            <Form.Control
              className='InputHF'
              placeholder="Optional"
              aria-label="User Hit-Factor"
              aria-describedby="basic-addon1"
              value={enteredHF || ''}
              onChange={e => setEnteredHF(e.target.value)}
              onBlur={() => setEnteredHF(Number(enteredHF))}
            />
          </InputGroup>
        </Row>
      </Container>
      <HHFTable
        official={hhfsProcessed[stage]}
        historical={psData}
        onDivisionClick={setSelectedDivision}
        enteredHF={Number(enteredHF)}
      />
      <Row className="HistoricalTable">
        <Container className="DivisionCard">
          <Row className="DivisionCardTitle">
            {(stage && selectedDivision) ? (<span> Top 100 ({selectedDivision}, {stage}) </span>)
            : (<span style={{fontSize:12}}> Click Division Name to See Historical Data </span>)}
          </Row>
          <Top100Historical
            enteredHF={Number(enteredHF)}
            stage={stage}
            division={selectedDivision}
            psData={psData}
            high={hhfsProcessed?.[stage]?.[selectedDivision]}
          />
        </Container>
      </Row>
    </div>
  );
}

export default App;
